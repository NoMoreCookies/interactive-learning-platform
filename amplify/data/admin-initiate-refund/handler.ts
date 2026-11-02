import {
  DynamoDBClient,
  GetItemCommand,
  TransactWriteItemsCommand,
  UpdateItemCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { env } from "$amplify/env/admin-initiate-refund";
import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import type { Schema } from "../resource";
import { preflightRefundHistory } from "../../shared/refund-reconciliation";

/**
 * SECURITY BOUNDARY
 * - ADMIN Cognito group checked here AND in AppSync.
 * - Complaint must already be APPROVED by a separate workflow.
 * - Price, customer, PaymentIntent and currency come ONLY from BillingPurchase.
 * - One durable claim per Checkout Session blocks duplicate automatic refunds.
 * - No automatic retry of an ambiguous Stripe POST.
 * - C1 NEVER changes Entitlement; enabling it requires completed C2.
 */
// 25s work budget < 28s Lambda < 30s AppSync. Reserve 14s before the
// transaction, 12s before arming and 10s before POST: POST 4s + result 1.5s
// + race read 1.5s + uncertain-state write 1.5s leaves scheduling margin.
// Timeouts bound local waiting; they never prove a remote write rolled back.
const db = new DynamoDBClient({ maxAttempts: 1, requestHandler: { connectionTimeout: 500, requestTimeout: 1_500, throwOnRequestTimeout: true } });
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  maxNetworkRetries: 0,
  timeout: 4_000,
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
  attemptId: string | null;
} | null> {
  const result = await db.send(new GetItemCommand({
    TableName: table.refunds,
    Key: { stripeCheckoutSessionId: { S: sessionId } },
    ConsistentRead: true,
  }));
  if (!result.Item) return null;
  return {
    attemptId: result.Item.attemptId?.S ?? null,
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

async function reserveRefund(purchase: Purchase, complaint: Complaint, adminId: string, historyVersion: number, attemptId: string, priorAttemptId?: string): Promise<void> {
  const now = new Date().toISOString();
  // Transactional ConditionChecks eliminate races with complaint/purchase updates.
  await db.send(new TransactWriteItemsCommand({
    TransactItems: [
      {
        ConditionCheck: {
          TableName: requiredEnv("ENTITLEMENT_TABLE_NAME"),
          Key: { userId: { S: purchase.userId } },
          ConditionExpression: "#version = :version AND purchaseHistoryState = :verified",
          ExpressionAttributeNames: { "#version": "version" },
          ExpressionAttributeValues: {
            ":version": { N: String(historyVersion) },
            ":verified": { S: "VERIFIED_V1" },
          },
        },
      },
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
      priorAttemptId ? {
        Update: {
          TableName: table.refunds,
          Key: { stripeCheckoutSessionId: { S: purchase.sessionId } },
          ConditionExpression: "#status = :ready AND attemptId = :prior AND complaintId = :complaint AND userId = :user AND stripePaymentIntentId = :pi AND amount = :amount AND currency = :currency AND attribute_not_exists(stripeRefundId) AND attribute_not_exists(lastObservation)",
          UpdateExpression: "SET attemptId = :attempt, updatedAt = :now, recoveryAudit = list_append(recoveryAudit, :audit)",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":ready": { S: "NOT_STARTED" }, ":prior": { S: priorAttemptId },
            ":attempt": { S: attemptId }, ":complaint": { S: complaint.complaintId },
            ":user": { S: purchase.userId }, ":pi": { S: purchase.paymentIntentId },
            ":amount": { N: String(purchase.amount) }, ":currency": { S: purchase.currency },
            ":now": { S: now }, ":audit": { L: [{ M: {
              transition: { S: "NOT_STARTED_RECLAIMED" }, adminId: { S: adminId },
              attemptId: { S: attemptId }, previousAttemptId: { S: priorAttemptId }, at: { S: now },
            } }] },
          },
        },
      } : {
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
            status: { S: "NOT_STARTED" },
            attemptId: { S: attemptId },
            recoveryAudit: { L: [{ M: {
              transition: { S: "RESERVED_NOT_STARTED" }, adminId: { S: adminId },
              attemptId: { S: attemptId }, at: { S: now },
            } }] },
            createdAt: { S: now },
            updatedAt: { S: now },
          },
          ConditionExpression: "attribute_not_exists(stripeCheckoutSessionId)",
        },
      },
    ],
  }));
}

// A successful fence is required before calling Stripe. A lost fence response
// is ambiguous locally: leave INITIATING blocked; never infer rollback.
async function armStripePost(sessionId: string, attemptId: string, adminId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.send(new UpdateItemCommand({
    TableName: table.refunds,
    Key: { stripeCheckoutSessionId: { S: sessionId } },
    ConditionExpression: "#status = :ready AND attemptId = :attempt AND attribute_not_exists(stripeRefundId) AND attribute_not_exists(lastObservation)",
    UpdateExpression: "SET #status = :initiating, updatedAt = :now, recoveryAudit = list_append(recoveryAudit, :audit)",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":ready": { S: "NOT_STARTED" }, ":initiating": { S: "INITIATING" },
      ":attempt": { S: attemptId }, ":now": { S: now },
      ":audit": { L: [{ M: {
        transition: { S: "POST_ARMED" }, attemptId: { S: attemptId },
        adminId: { S: adminId }, at: { S: now },
      } }] },
    },
  }));
}

async function storeStripeResult(
  sessionId: string,
  stripeRefundId: string,
  stripeStatus: string,
  attemptId: string,
): Promise<void> {
  await db.send(new UpdateItemCommand({
    TableName: table.refunds,
    Key: { stripeCheckoutSessionId: { S: sessionId } },
    UpdateExpression: "SET #status = :awaiting, stripeRefundId = :refundId, stripeStatus = :stripeStatus, updatedAt = :now",
    ConditionExpression: "#status = :initiating AND attemptId = :attempt AND attribute_not_exists(stripeRefundId) AND attribute_not_exists(lastObservation)",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":attempt": { S: attemptId },
      ":awaiting": { S: "AWAITING_RECONCILIATION" },
      ":initiating": { S: "INITIATING" },
      ":refundId": { S: stripeRefundId },
      ":stripeStatus": { S: stripeStatus },
      ":now": { S: new Date().toISOString() },
    },
  }));
}

async function markUncertain(sessionId: string, attemptId: string, postAttempted: boolean): Promise<void> {
  try {
    await db.send(new UpdateItemCommand({
      TableName: table.refunds,
      Key: { stripeCheckoutSessionId: { S: sessionId } },
      UpdateExpression: "SET #status = :uncertain, updatedAt = :now, recoveryAudit = list_append(recoveryAudit, :audit)",
      ConditionExpression: "#status = :initiating AND attemptId = :attempt AND attribute_not_exists(stripeRefundId) AND attribute_not_exists(lastObservation)",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":uncertain": { S: postAttempted ? "RECONCILIATION_REQUIRED" : "NOT_STARTED" },
        ":attempt": { S: attemptId },
        ":audit": { L: [{ M: {
          transition: { S: postAttempted ? "POST_OUTCOME_UNCERTAIN" : "CONFIRMED_NOT_STARTED" },
          attemptId: { S: attemptId }, at: { S: new Date().toISOString() },
        } }] },
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
  const deadline = performance.now() + 25_000;
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
  if (prior) {
    describeExisting(prior, complaintId); // association check also applies to recovery
    if (prior.status !== "NOT_STARTED" || !prior.attemptId || prior.stripeRefundId) {
      return describeExisting(prior, complaintId);
    }
  }
  const attemptId = randomUUID();

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
  const pi = await stripe.paymentIntents.retrieve(purchase.paymentIntentId, {}, { timeout: 2_000 });
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
  }, { timeout: 2_000 });
  if (priorStripeRefunds.has_more || priorStripeRefunds.data.length > 0) {
    throw new Error("Dla tej płatności istnieje już refund w Stripe. Wymagane ręczne uzgodnienie.");
  }

  const historyVersion = await preflightRefundHistory(purchase.userId, purchase.sessionId);
  if (deadline - performance.now() < 14_000) {
    throw new Error("Brak czasu na bezpieczne wykonanie zwrotu; nie wysłano Stripe POST.");
  }
  try {
    await reserveRefund(purchase, complaint, adminId, historyVersion, attemptId, prior?.attemptId ?? undefined);
  } catch (error) {
    const competing = await existingRefund(stripeCheckoutSessionId);
    if (competing) return describeExisting(competing, complaintId);
    console.warn("Refund reservation rejected", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    throw new Error("Nie udało się bezpiecznie zarezerwować zwrotu.");
  }

  // NOT_STARTED is durable and safe to reclaim even if this invocation dies.
  if (deadline - performance.now() < 12_000) {
    throw new Error("Brak czasu; rezerwacja NOT_STARTED może zostać wznowiona przez ADMIN.");
  }
  await armStripePost(stripeCheckoutSessionId, attemptId, adminId);
  let postAttempted = false;
  try {
    if (deadline - performance.now() < 10_000) {
      throw new Error("Insufficient time after reservation; Stripe POST not started.");
    }
    postAttempted = true; // Any error from this point is an ambiguous POST outcome.
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
      throw new Error("Stripe zwrócił niezgodny refund. Wymagana ręczna weryfikacja.");
    }
    try {
      await storeStripeResult(stripeCheckoutSessionId, refund.id, refund.status ?? "unknown", attemptId);
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
    await markUncertain(stripeCheckoutSessionId, attemptId, postAttempted);
    if (!postAttempted) {
      throw new Error("Nie wysłano Stripe POST. Ponów zatwierdzenie ADMIN wyłącznie dla stanu NOT_STARTED.");
    }
    console.error("Refund outcome needs reconciliation", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    throw new Error("Nie można potwierdzić wyniku zwrotu. Sprawdź Stripe i rekord BillingRefund przed ponowieniem.");
  }
};
