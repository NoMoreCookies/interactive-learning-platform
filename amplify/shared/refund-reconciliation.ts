import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  TransactWriteItemsCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import type Stripe from "stripe";
import { calculateSurvivingAccess, type PaidPurchase } from "./refund-entitlement";

/*
 * Financial authorization boundary shared by a SIGNED Stripe webhook and an
 * explicitly authorized ADMIN-only reconciliation Lambda.
 *
 * Never trust metadata alone: compare refund ID, PaymentIntent, amount,
 * currency, Checkout Session and owner against our private DynamoDB records.
 */
const db = new DynamoDBClient({});
const MAX_PURCHASES_PER_USER = 100;
const MAX_OPTIMISTIC_RETRIES = 5;
const SESSION_PATTERN = /^cs_(?:test|live)_[A-Za-z0-9]{8,220}$/;
const REFUND_PATTERN = /^(?:re|pyr)_[A-Za-z0-9]{8,220}$/;
const PAYMENT_INTENT_PATTERN = /^pi_[A-Za-z0-9]{8,220}$/;

type Item = Record<string, AttributeValue>;
type Names = {
  refunds: string;
  purchases: string;
  entitlements: string;
  events: string;
};
type RefundRecord = {
  sessionId: string;
  refundId: string | null;
  paymentIntentId: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  complaintId: string;
  lastObservation: number | null;
};
type Entitlement = {
  version: number;
  lastPurchaseId: string | null;
  revokedReason: string | null;
};

function requiredEnvironment(key: string): string {
  const result = process.env[key]?.trim();
  if (!result) throw new Error(`Missing refund reconciliation configuration: ${key}`);
  return result;
}
function tableNames(): Names {
  return {
    refunds: requiredEnvironment("BILLING_REFUND_TABLE_NAME"),
    purchases: requiredEnvironment("BILLING_PURCHASE_TABLE_NAME"),
    entitlements: requiredEnvironment("ENTITLEMENT_TABLE_NAME"),
    events: requiredEnvironment("STRIPE_EVENT_TABLE_NAME"),
  };
}
function requiredString(item: Item, key: string): string {
  const val = item[key]?.S;
  if (!val) throw new Error(`Invalid stored ${key}`);
  return val;
}
function positiveNumber(item: Item, key: string): number {
  const val = Number(item[key]?.N);
  if (!Number.isSafeInteger(val) || val <= 0) throw new Error(`Invalid stored ${key}`);
  return val;
}
function normalizedPi(refund: Stripe.Refund): string | null {
  const value = refund.payment_intent;
  if (typeof value === "string") return value;
  return value?.id ?? null;
}
function stripeStatus(refund: Stripe.Refund): "SUCCEEDED" | "PENDING" | "FAILED" | "CANCELED" | "REQUIRES_ACTION" {
  if (refund.status === "succeeded") return "SUCCEEDED";
  if (refund.status === "pending") return "PENDING";
  if (refund.status === "failed") return "FAILED";
  if (refund.status === "canceled") return "CANCELED";
  if (refund.status === "requires_action") return "REQUIRES_ACTION";
  throw new Error("Unknown refund status; reconciliation requires review.");
}
async function recordEventOnly(names: Names, eventId: string, refund: Stripe.Refund, outcome: string) {
  try {
    await db.send(new PutItemCommand({
      TableName: names.events,
      Item: {
        eventId: { S: eventId }, eventType: { S: "REFUND_OBSERVATION" },
        stripeRefundId: { S: refund.id }, outcome: { S: outcome },
        processedAt: { S: new Date().toISOString() },
      },
      ConditionExpression: "attribute_not_exists(eventId)",
    }));
  } catch (error) {
    if ((error as { name?: string }).name !== "ConditionalCheckFailedException") throw error;
  }
}
async function getRefundRecord(names: Names, sessionId: string): Promise<RefundRecord> {
  const { Item: record } = await db.send(new GetItemCommand({
    TableName: names.refunds,
    Key: { stripeCheckoutSessionId: { S: sessionId } }, ConsistentRead: true,
  }));
  if (!record) throw new Error("Refund has no durable reservation; investigate Stripe Dashboard before reconciliation.");
  const refundId = record.stripeRefundId?.S ?? null;
  return {
    sessionId, refundId,
    complaintId: requiredString(record, "complaintId"),
    paymentIntentId: requiredString(record, "stripePaymentIntentId"),
    userId: requiredString(record, "userId"),
    amount: positiveNumber(record, "amount"),
    currency: requiredString(record, "currency"),
    status: requiredString(record, "status"),
    lastObservation: record.lastObservation?.N ? Number(record.lastObservation.N) : null,
  };
}
async function getPurchase(names: Names, sessionId: string): Promise<Item> {
  const result = await db.send(new GetItemCommand({
    TableName: names.purchases,
    Key: { stripeCheckoutSessionId: { S: sessionId } }, ConsistentRead: true,
  }));
  if (!result.Item) throw new Error("Purchased session missing from billing ledger.");
  return result.Item;
}
async function getEntitlement(names: Names, userId: string): Promise<Entitlement> {
  const { Item: item } = await db.send(new GetItemCommand({
    TableName: names.entitlements,
    Key: { userId: { S: userId } }, ConsistentRead: true,
  }));
  if (!item) throw new Error("Purchase has no entitlement; requires investigation.");
  const version = positiveNumber(item, "version");
  if (requiredString(item, "productCode") !== "PREMIUM") throw new Error("Unexpected entitlement product.");
  return {
    version,
    lastPurchaseId: item.lastPurchaseId?.S ?? null,
    revokedReason: item.revocationReason?.S ?? null,
  };
}

/* Query GSI is eventually consistent. Verify the currently known lastPurchaseId
 * from a STRONGLY consistent Entitlement so a just-processed checkout cannot
 * silently disappear from a recalculation. If proof is unavailable: RETRY.
 * Restrict per-user work to limit Lambda duration and cost abuse.
 */
async function readAllPurchases(names: Names, userId: string, requiredPurchaseId: string | null): Promise<Array<{item: Item; sessionId: string}>> {
  const keys: string[] = [];
  let cursor: Record<string, AttributeValue> | undefined;
  do {
    const result = await db.send(new QueryCommand({
      TableName: names.purchases, IndexName: "userId-index",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: { ":userId": { S: userId } },
      ProjectionExpression: "stripeCheckoutSessionId",
      ExclusiveStartKey: cursor,
      Limit: MAX_PURCHASES_PER_USER + 1,
    }));
    for (const item of result.Items ?? []) {
      keys.push(requiredString(item, "stripeCheckoutSessionId"));
    }
    if (keys.length > MAX_PURCHASES_PER_USER) throw new Error("Too many purchases for automatic entitlement reconciliation.");
    cursor = result.LastEvaluatedKey;
  } while (cursor);
  if (requiredPurchaseId && !keys.includes(requiredPurchaseId)) {
    throw new Error("Purchase index is lagging Entitlement; retry reconciliation.");
  }
  const purchases: Array<{item: Item; sessionId: string}> = [];
  // Sequential strongly consistent lookups are bounded at MAX_PURCHASES_PER_USER.
  for (const sessionId of keys) {
    const item = await getPurchase(names, sessionId);
    if (requiredString(item, "userId") !== userId) throw new Error("Owner mismatch in purchase ledger.");
    purchases.push({ item, sessionId });
  }
  return purchases;
}

export type RefundObservation = { outcome: "SUCCEEDED" | "PENDING" | "FAILED" | "CANCELED" | "REQUIRES_ACTION" | "DUPLICATE"; refundId: string; };

/**
 * Applies one authoritative refund observation. For webhooks the event must
 * already be cryptographically verified by the Stripe SDK. For the manual
 * reconciliation Lambda the refund is freshly retrieved from Stripe API.
 * No new Refund POST is issued here.
 */
export async function applyRefundObservation(refund: Stripe.Refund, eventId: string, observationSeconds: number): Promise<RefundObservation> {
  if (!/^evt_[A-Za-z0-9]{8,220}$/.test(eventId) && !/^manual_[A-Za-z0-9_-]{8,220}$/.test(eventId)) {
    throw new Error("Invalid observation identifier.");
  }
  if (!REFUND_PATTERN.test(refund.id)) throw new Error("Invalid Stripe refund ID.");
  if (!Number.isSafeInteger(observationSeconds) || observationSeconds <= 0) {
    throw new Error("Invalid Stripe observation timestamp.");
  }
  const sessionId = refund.metadata?.stripeCheckoutSessionId;
  const complaintId = refund.metadata?.complaintId;
  if (!sessionId || !SESSION_PATTERN.test(sessionId) || !complaintId) {
    throw new Error("Refund missing trusted correlation metadata; needs manual investigation.");
  }
  const names = tableNames();
  const record = await getRefundRecord(names, sessionId);
  if (
    record.complaintId !== complaintId ||
    !PAYMENT_INTENT_PATTERN.test(record.paymentIntentId) ||
    record.paymentIntentId !== normalizedPi(refund) ||
    record.currency !== refund.currency ||
    record.amount !== refund.amount ||
    (record.refundId !== null && record.refundId !== refund.id)
  ) {
    throw new Error("Signed Stripe refund does not match our reserved purchase.");
  }
  const purchase = await getPurchase(names, sessionId);
  if (
    requiredString(purchase, "stripePaymentIntentId") !== record.paymentIntentId ||
    requiredString(purchase, "userId") !== record.userId ||
    requiredString(purchase, "currency") !== record.currency ||
    positiveNumber(purchase, "amountTotal") !== record.amount
  ) {
    throw new Error("Reserved refund does not match immutable paid purchase.");
  }
  const currentStripeStatus = stripeStatus(refund);
  if (record.lastObservation !== null && record.lastObservation > observationSeconds) {
    if (currentStripeStatus === "SUCCEEDED" && record.status !== "SUCCEEDED") {
      throw new Error("Out-of-order successful refund requires Stripe API reconciliation.");
    }
    await recordEventOnly(names, eventId, refund, "OUT_OF_ORDER_EVENT");
    return { outcome: "DUPLICATE", refundId: refund.id };
  }
  if (record.status === "SUCCEEDED") {
    if (currentStripeStatus !== "SUCCEEDED") {
      throw new Error("Stripe observation conflicts with an already settled refund.");
    }
    await recordEventOnly(names, eventId, refund, "ALREADY_RECONCILED");
    return { outcome: "DUPLICATE", refundId: refund.id };
  }
  if (["FAILED", "CANCELED"].includes(record.status) && currentStripeStatus === "SUCCEEDED") {
    throw new Error("Conflicting terminal refund states; manual review required.");
  }
  const now = new Date().toISOString();
  const statusValues = {
    ":newStatus": { S: currentStripeStatus },
    ":refundId": { S: refund.id },
    ":now": { S: now },
    ":pi": { S: record.paymentIntentId },
    ":amount": { N: String(record.amount) },
    ":complaintId": { S: record.complaintId },
    ":observation": { N: String(observationSeconds) },
  };

  if (currentStripeStatus !== "SUCCEEDED") {
    if (["FAILED", "CANCELED"].includes(record.status)) {
      await recordEventOnly(names, eventId, refund, "TERMINAL_ALREADY_RECORDED");
      return { outcome: "DUPLICATE", refundId: refund.id };
    }
    try {
      await db.send(new TransactWriteItemsCommand({ TransactItems: [
        { Put: { TableName: names.events, Item: {
          eventId: { S: eventId }, eventType: { S: "REFUND_OBSERVATION" },
          stripeRefundId: { S: refund.id }, outcome: { S: currentStripeStatus },
          processedAt: { S: now },
        }, ConditionExpression: "attribute_not_exists(eventId)" } },
        { Update: { TableName: names.refunds,
          Key: { stripeCheckoutSessionId: { S: sessionId } },
          ConditionExpression: "#status <> :succeeded AND (attribute_not_exists(stripeRefundId) OR stripeRefundId = :refundId) AND (attribute_not_exists(lastObservation) OR lastObservation <= :observation) AND stripePaymentIntentId = :pi AND amount = :amount AND complaintId = :complaintId",
          UpdateExpression: "SET #status = :newStatus, stripeRefundId = :refundId, stripeStatus = :newStatus, lastObservation = :observation, updatedAt = :now",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ...statusValues, ":succeeded": { S: "SUCCEEDED" } },
        } },
      ] }));
    } catch (error) {
      if ((error as {name?: string}).name === "TransactionCanceledException") {
        const latest = await getRefundRecord(names, sessionId);
        if (latest.status === "SUCCEEDED" || latest.status === currentStripeStatus ||
            (latest.lastObservation !== null && latest.lastObservation > observationSeconds)) {
          return { outcome: "DUPLICATE", refundId: refund.id };
        }
      }
      throw error;
    }
    return { outcome: currentStripeStatus, refundId: refund.id };
  }

  for (let attempt = 0; attempt < MAX_OPTIMISTIC_RETRIES; attempt++) {
    const latest = await getRefundRecord(names, sessionId);
    if (latest.lastObservation !== null && latest.lastObservation > observationSeconds) {
      if (latest.status !== "SUCCEEDED") {
        throw new Error("Out-of-order successful refund requires Stripe API reconciliation.");
      }
      await recordEventOnly(names, eventId, refund, "OUT_OF_ORDER_EVENT");
      return { outcome: "DUPLICATE", refundId: refund.id };
    }
    if (latest.status === "SUCCEEDED") {
      await recordEventOnly(names, eventId, refund, "ALREADY_RECONCILED");
      return { outcome: "DUPLICATE", refundId: refund.id };
    }
    if (["FAILED", "CANCELED"].includes(latest.status)) throw new Error("Cannot reconcile conflicting terminal refund.");

    const entitlement = await getEntitlement(names, record.userId);
    if (entitlement.revokedReason && entitlement.revokedReason !== "REFUND_RECONCILIATION") {
      throw new Error("Entitlement already revoked for another reason; requires manual review.");
    }
    const allPurchases = await readAllPurchases(names, record.userId, entitlement.lastPurchaseId);
    if (!allPurchases.some(({sessionId: id}) => id === sessionId)) throw new Error("Refunded purchase missing from GSI; retry.");
    const survivors: PaidPurchase[] = [];
    for (const {item, sessionId: id} of allPurchases) {
      if (id === sessionId) continue;
      const other = await db.send(new GetItemCommand({
        TableName: names.refunds,
        Key: { stripeCheckoutSessionId: { S: id } }, ConsistentRead: true,
        ProjectionExpression: "#status",
        ExpressionAttributeNames: { "#status": "status" },
      }));
      if (other.Item?.status?.S === "SUCCEEDED") continue;
      survivors.push({
        stripeCheckoutSessionId: id,
        paidAt: requiredString(item, "paidAt"),
        grantedFrom: requiredString(item, "grantedFrom"),
        accessDays: positiveNumber(item, "accessDays"),
      });
    }
    const calculated = calculateSurvivingAccess(survivors);
    const noAccess = calculated.accessUntil === null;
    const updatePieces = ["accessUntil = :until", "updatedAt = :now", "#version = :next", "#source = :source"];
    const removals: string[] = [];
    const accessValues: Record<string, AttributeValue> = {
      ":until": { S: calculated.accessUntil ?? now },
      ":now": { S: now }, ":next": { N: String(entitlement.version + 1) },
      ":previous": { N: String(entitlement.version) },
      ":source": { S: "STRIPE_ONE_TIME" },
    };
    if (noAccess) {
      updatePieces.push("revokedAt = :now", "revocationReason = :revocationReason");
      accessValues[":revocationReason"] = { S: "REFUND_RECONCILIATION" };
      removals.push("lastPurchaseId");
    } else {
      if (!calculated.lastPurchaseId) throw new Error("Inconsistent access calculation.");
      updatePieces.push("lastPurchaseId = :lastPurchaseId");
      accessValues[":lastPurchaseId"] = { S: calculated.lastPurchaseId };
      removals.push("revokedAt", "revocationReason");
    }
    const updateExpression = `SET ${updatePieces.join(", ")}${removals.length ? ` REMOVE ${removals.join(", ")}` : ""}`;

    try {
      await db.send(new TransactWriteItemsCommand({ TransactItems: [
        { Put: { TableName: names.events, Item: {
          eventId: { S: eventId }, eventType: { S: "REFUND_OBSERVATION" },
          stripeRefundId: { S: refund.id }, outcome: { S: "REFUND_SUCCEEDED" },
          processedAt: { S: now },
        }, ConditionExpression: "attribute_not_exists(eventId)" } },
        { Update: { TableName: names.refunds,
          Key: { stripeCheckoutSessionId: { S: sessionId } },
          ConditionExpression: "#status <> :succeeded AND (attribute_not_exists(stripeRefundId) OR stripeRefundId = :refundId) AND (attribute_not_exists(lastObservation) OR lastObservation <= :observation) AND stripePaymentIntentId = :pi AND amount = :amount AND complaintId = :complaintId",
          UpdateExpression: "SET #status = :newStatus, stripeRefundId = :refundId, stripeStatus = :newStatus, lastObservation = :observation, updatedAt = :now, succeededAt = :now",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ...statusValues, ":succeeded": { S: "SUCCEEDED" } },
        } },
        { Update: { TableName: names.entitlements,
          Key: { userId: { S: record.userId } },
          ConditionExpression: "#version = :previous",
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: { "#version": "version", "#source": "source" },
          ExpressionAttributeValues: accessValues,
        } },
      ] }));
      return { outcome: "SUCCEEDED", refundId: refund.id };
    } catch (error) {
      if ((error as {name?: string}).name !== "TransactionCanceledException") throw error;
      const latestRecord = await getRefundRecord(names, sessionId);
      if (latestRecord.status === "SUCCEEDED") {
        return { outcome: "DUPLICATE", refundId: refund.id };
      }
      if (latestRecord.lastObservation !== null && latestRecord.lastObservation > observationSeconds) {
        throw new Error("Out-of-order successful refund requires Stripe API reconciliation.");
      }
      // Could also be a concurrent new purchase: re-read entitlement and retry.
    }
  }
  throw new Error("Concurrent purchases prevented safe reconciliation; retry later.");
}
