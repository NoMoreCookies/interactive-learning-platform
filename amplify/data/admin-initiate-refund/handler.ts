import {
  DynamoDBClient,
  GetItemCommand,
  TransactWriteItemsCommand,
  UpdateItemCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { env } from "$amplify/env/admin-initiate-refund";
import Stripe from "stripe";
import type { Schema } from "../resource";

/**
 * SECURITY BOUNDARY
 * - ADMIN Cognito group checked here AND in AppSync.
 * - Complaint must already be APPROVED by a separate workflow.
 * - Price, customer, PaymentIntent and currency come ONLY from BillingPurchase.
 * - One durable claim per Checkout Session blocks duplicate automatic refunds.
 * - No automatic retry of an ambiguous Stripe POST.
 * - C1 NEVER changes Entitlement; enabling it requires completed C2.
 */
const db = new DynamoDBClient({});
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  maxNetworkRetries: 0,
  timeout: 10_000,
});

const SESSION_ID_PATTERN = /^cs_(?:test|live)_[A-Za-z0-9]{8,220}$/;
const COMPLAINT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

const table = {
  complaints: requiredEnv("COMPLAINT_TABLE_NAME"),
  purchases: requiredEnv("BILLING_PURCHASE_TABLE_NAME"),
  refunds: requiredEnv("BILLING_REFUND_TABLE_NAME"),
};

type Attributes = Record<string, AttributeValue>;

type Purchase = {
  sessionId: string;
  userId: string;
  customerId: string;
  paymentIntentId: string;
  amount: number;
  currency: "pln";
};

type Complaint = {
  complaintId: string;
  userId: string;
  sessionId: string;
  status: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}

function requiredString(item: Attributes, name: string): string {
  const value = item[name]?.S;
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid stored field: ${name}`);
  }
  return value;
}

function assertedAdminId(identity: unknown): string {
  if (!identity || typeof identity !== "object") {
    throw new Error("Brak uprawnień.");
  }
  const claims = (identity as { claims?: Record<string, unknown> }).claims;
  const directGroups = (identity as { groups?: unknown }).groups;
  const rawGroups = Array.isArray(directGroups) ? directGroups : claims?.["cognito:groups"];
  const groups = Array.isArray(rawGroups)
    ? rawGroups.filter((value): value is string => typeof value === "string")
    : typeof rawGroups === "string"
      ? rawGroups.split(",").map((value) => value.trim())
      : [];
  if (!groups.includes("ADMIN")) throw new Error("Brak uprawnień.");

  const record = identity as { sub?: unknown };
  const sub = typeof record.sub === "string" ? record.sub : claims?.sub;
  if (typeof sub !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(sub)) {
    throw new Error("Brak poprawnej tożsamości administratora.");
  }
  return sub;
}

async function getPurchase(sessionId: string): Promise<Purchase> {
  const result = await db.send(new GetItemCommand({
    TableName: table.purchases,
    Key: { stripeCheckoutSessionId: { S: sessionId } },
    ConsistentRead: true,
  }));
  if (!result.Item) throw new Error("Nie znaleziono opłaconego zakupu.");
  const item = result.Item;
  const amount = Number(item.amountTotal?.N);
  const currency = requiredString(item, "currency");
  if (!Number.isSafeInteger(amount) || amount <= 0 || currency !== "pln") {
    throw new Error("Nieprawidłowy zapis kwoty zakupu.");
  }
  return {
    sessionId,
    userId: requiredString(item, "userId"),
    customerId: requiredString(item, "stripeCustomerId"),
    paymentIntentId: requiredString(item, "stripePaymentIntentId"),
    amount,
    currency: "pln",
  };
}

async function getComplaint(complaintId: string): Promise<Complaint> {
  const result = await db.send(new GetItemCommand({
    TableName: table.complaints,
    Key: { complaintId: { S: complaintId } },
    ConsistentRead: true,
  }));
  if (!result.Item) throw new Error("Nie znaleziono reklamacji.");
  return {
    complaintId,
    userId: requiredString(result.Item, "userId"),
    sessionId: requiredString(result.Item, "stripeCheckoutSessionId"),
    status: requiredString(result.Item, "status"),
  };
}

async function existingRefund(sessionId: string): Promise<{
  status: string;
  stripeRefundId: string | null;
  complaintId: string;
} | null> {
  const result = await db.send(new GetItemCommand({
    TableName: table.refunds,
    Key: { stripeCheckoutSessionId: { S: sessionId } },
    ConsistentRead: true,
  }));
  if (!result.Item) return null;
  return {
    status: requiredString(result.Item, "status"),
    stripeRefundId: result.Item.stripeRefundId?.S ?? null,
    complaintId: requiredString(result.Item, "complaintId"),
  };
}

function describeExisting(refund: NonNullable<Awaited<ReturnType<typeof existingRefund>>>, complaintId: string) {
  if (refund.complaintId !== complaintId) {
    throw new Error("Ten zakup ma już odrębną operację zwrotu.");
  }
  return {
    status: refund.status,
    stripeRefundId: refund.stripeRefundId,
  };
}

async function reserveRefund(purchase: Purchase, complaint: Complaint, adminId: string): Promise<void> {
  const now = new Date().toISOString();
  // Transactional ConditionChecks eliminate races with complaint/purchase updates.
  await db.send(new TransactWriteItemsCommand({
    TransactItems: [
      {
        ConditionCheck: {
          TableName: table.complaints,
          Key: { complaintId: { S: complaint.complaintId } },
          ConditionExpression: "#status = :approved AND userId = :userId AND stripeCheckoutSessionId = :sessionId",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":approved": { S: "APPROVED" },
            ":userId": { S: purchase.userId },
            ":sessionId": { S: purchase.sessionId },
          },
        },
      },
      {
        ConditionCheck: {
          TableName: table.purchases,
          Key: { stripeCheckoutSessionId: { S: purchase.sessionId } },
          ConditionExpression: "userId = :userId AND stripePaymentIntentId = :pi AND amountTotal = :amount AND currency = :currency",
          ExpressionAttributeValues: {
            ":userId": { S: purchase.userId },
            ":pi": { S: purchase.paymentIntentId },
            ":amount": { N: String(purchase.amount) },
            ":currency": { S: purchase.currency },
          },
        },
      },
      {
        Put: {
          TableName: table.refunds,
          Item: {
            stripeCheckoutSessionId: { S: purchase.sessionId },
            complaintId: { S: complaint.complaintId },
            userId: { S: purchase.userId },
            adminId: { S: adminId },
            stripePaymentIntentId: { S: purchase.paymentIntentId },
            amount: { N: String(purchase.amount) },
            currency: { S: purchase.currency },
            status: { S: "INITIATING" },
            createdAt: { S: now },
            updatedAt: { S: now },
          },
          ConditionExpression: "attribute_not_exists(stripeCheckoutSessionId)",
        },
      },
    ],
  }));
}

async function storeStripeResult(
  sessionId: string,
  stripeRefundId: string,
  stripeStatus: string,
): Promise<void> {
  await db.send(new UpdateItemCommand({
    TableName: table.refunds,
    Key: { stripeCheckoutSessionId: { S: sessionId } },
    UpdateExpression: "SET #status = :awaiting, stripeRefundId = :refundId, stripeStatus = :stripeStatus, updatedAt = :now",
    ConditionExpression: "#status = :initiating AND attribute_not_exists(stripeRefundId)",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":awaiting": { S: "AWAITING_RECONCILIATION" },
      ":initiating": { S: "INITIATING" },
      ":refundId": { S: stripeRefundId },
      ":stripeStatus": { S: stripeStatus },
      ":now": { S: new Date().toISOString() },
    },
  }));
}

async function markUncertain(sessionId: string): Promise<void> {
  try {
    await db.send(new UpdateItemCommand({
      TableName: table.refunds,
      Key: { stripeCheckoutSessionId: { S: sessionId } },
      UpdateExpression: "SET #status = :uncertain, updatedAt = :now",
      ConditionExpression: "#status = :initiating",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":uncertain": { S: "RECONCILIATION_REQUIRED" },
        ":initiating": { S: "INITIATING" },
        ":now": { S: new Date().toISOString() },
      },
    }));
  } catch (error) {
    console.error("Could not record uncertain refund state", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

export const handler: Schema["adminInitiateRefund"]["functionHandler"] = async (event) => {
  const adminId = assertedAdminId(event.identity);
  const { complaintId, stripeCheckoutSessionId, confirmationSessionId } = event.arguments;
  if (
    typeof complaintId !== "string" || !COMPLAINT_ID_PATTERN.test(complaintId) ||
    typeof stripeCheckoutSessionId !== "string" || !SESSION_ID_PATTERN.test(stripeCheckoutSessionId) ||
    confirmationSessionId !== stripeCheckoutSessionId
  ) {
    throw new Error("Nieprawidłowe parametry zatwierdzenia zwrotu.");
  }

  // An explicit deployment-time circuit breaker. Never enable before C2.
  if (env.REFUND_EXECUTION_ENABLED !== "true") {
    throw new Error("Wykonywanie zwrotów jest chwilowo wyłączone.");
  }

  const prior = await existingRefund(stripeCheckoutSessionId);
  if (prior) return describeExisting(prior, complaintId);

  const [purchase, complaint] = await Promise.all([
    getPurchase(stripeCheckoutSessionId),
    getComplaint(complaintId),
  ]);
  if (
    complaint.userId !== purchase.userId ||
    complaint.sessionId !== purchase.sessionId ||
    complaint.status !== "APPROVED"
  ) {
    throw new Error("Reklamacja nie została zatwierdzona dla tego zakupu.");
  }

  const expectedLive = env.STRIPE_EXPECTED_LIVEMODE;
  if (expectedLive !== "true" && expectedLive !== "false") {
    throw new Error("Nieprawidłowa konfiguracja Stripe.");
  }
  const livemode = expectedLive === "true";
  if ((livemode && !env.STRIPE_SECRET_KEY.startsWith("sk_live_")) ||
      (!livemode && !env.STRIPE_SECRET_KEY.startsWith("sk_test_"))) {
    throw new Error("Klucz Stripe nie odpowiada trybowi środowiska.");
  }

  // Preflight is read-only and happens BEFORE we reserve a refund.
  const pi = await stripe.paymentIntents.retrieve(purchase.paymentIntentId);
  if (
    pi.livemode !== livemode || pi.status !== "succeeded" ||
    pi.amount_received !== purchase.amount || pi.currency !== purchase.currency ||
    (typeof pi.customer === "string" ? pi.customer : pi.customer?.id) !== purchase.customerId
  ) {
    throw new Error("Dane płatności w Stripe nie zgadzają się z zakupem.");
  }
  const priorStripeRefunds = await stripe.refunds.list({
    payment_intent: purchase.paymentIntentId,
    limit: 1,
  });
  if (priorStripeRefunds.has_more || priorStripeRefunds.data.length > 0) {
    throw new Error("Dla tej płatności istnieje już refund w Stripe. Wymagane ręczne uzgodnienie.");
  }

  try {
    await reserveRefund(purchase, complaint, adminId);
  } catch (error) {
    const competing = await existingRefund(stripeCheckoutSessionId);
    if (competing) return describeExisting(competing, complaintId);
    console.warn("Refund reservation rejected", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    throw new Error("Nie udało się bezpiecznie zarezerwować zwrotu.");
  }

  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: purchase.paymentIntentId,
        amount: purchase.amount, // smallest PLN unit, trusted database value
        reason: "requested_by_customer",
        metadata: {
          complaintId,
          stripeCheckoutSessionId,
        },
      },
      { idempotencyKey: `poprostumatma:refund:v1:${stripeCheckoutSessionId}` },
    );
    if (
      refund.amount !== purchase.amount || refund.currency !== purchase.currency ||
      refund.payment_intent !== purchase.paymentIntentId
    ) {
      await markUncertain(stripeCheckoutSessionId);
      throw new Error("Stripe zwrócił niezgodny refund. Wymagana ręczna weryfikacja.");
    }
    try {
      await storeStripeResult(stripeCheckoutSessionId, refund.id, refund.status ?? "unknown");
    } catch (dbError) {
      /* A signed Stripe webhook may have reconciled the refund before this
       * admin Lambda received its POST response. Never overwrite SUCCEEDED.
       */
      const latest = await existingRefund(stripeCheckoutSessionId);
      if (!latest || latest.stripeRefundId !== refund.id || ![
        "SUCCEEDED", "FAILED", "CANCELED", "PENDING", "REQUIRES_ACTION",
      ].includes(latest.status)) {
        throw dbError;
      }
      return { status: latest.status, stripeRefundId: refund.id };
    }
    return { status: "AWAITING_RECONCILIATION", stripeRefundId: refund.id };
  } catch (error) {
    // Could have succeeded remotely. NEVER automatically issue a second POST.
    await markUncertain(stripeCheckoutSessionId);
    console.error("Refund outcome needs reconciliation", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    throw new Error("Nie można potwierdzić wyniku zwrotu. Sprawdź Stripe i rekord BillingRefund przed ponowieniem.");
  }
};
