import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  TransactWriteItemsCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import type Stripe from "stripe";
import { purchaseHistory, type PurchaseHistory } from "./purchase-history";
import { calculateSurvivingAccess, type PaidPurchase } from "./refund-entitlement";

/*
 * Financial authorization boundary shared by a SIGNED Stripe webhook and an
 * explicitly authorized ADMIN-only reconciliation Lambda.
 *
 * Never trust metadata alone: compare refund ID, PaymentIntent, amount,
 * currency, Checkout Session and owner against our private DynamoDB records.
 */
const db = new DynamoDBClient({ maxAttempts: 1, requestHandler: { connectionTimeout: 1_000, requestTimeout: 3_000 } });
const MAX_PURCHASES_PER_USER = 100;
const MAX_OPTIMISTIC_RETRIES = 5;
const SESSION_PATTERN = /^cs_(?:test|live)_[A-Za-z0-9]{8,220}$/;
const REFUND_PATTERN = /^(?:re|pyr)_[A-Za-z0-9]{8,220}$/;
const PAYMENT_INTENT_PATTERN = /^pi_[A-Za-z0-9]{8,220}$/;

type Item = Record<string, AttributeValue>;
type ReconciliationOptions = { client?: DynamoDBClient; signal?: AbortSignal; assertTransactionBudget?: () => void };
type Names = {
  client: DynamoDBClient;
  signal?: AbortSignal;
  assertTransactionBudget?: () => void;
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
  complaintId: string | null;
  origin: string;
  customerId: string | null;
  lastObservation: number | null;
};
type Entitlement = {
  version: number;
  history: PurchaseHistory;
  revokedReason: string | null;
};

function requiredEnvironment(key: string): string {
  const result = process.env[key]?.trim();
  if (!result) throw new Error(`Missing refund reconciliation configuration: ${key}`);
  return result;
}
function tableNames(options: ReconciliationOptions = {}): Names {
  return {
    client: options.client ?? db,
    signal: options.signal,
    assertTransactionBudget: options.assertTransactionBudget,
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
    await names.client.send(new PutItemCommand({
      TableName: names.events,
      Item: {
        eventId: { S: eventId }, eventType: { S: outcome.startsWith("MANUAL_REVIEW_") ? "EXTERNAL_REFUND_REVIEW" : "REFUND_OBSERVATION" },
        stripeRefundId: { S: refund.id }, outcome: { S: outcome },
        processedAt: { S: new Date().toISOString() },
        ...(outcome.startsWith("MANUAL_REVIEW_") ? { reviewState: { S: "MANUAL_REVIEW" } } : {}),
      },
      ConditionExpression: "attribute_not_exists(eventId)",
    }), { abortSignal: names.signal });
  } catch (error) {
    if ((error as { name?: string }).name !== "ConditionalCheckFailedException") throw error;
  }
}
async function getRefundRecord(names: Names, sessionId: string): Promise<RefundRecord> {
  const { Item: record } = await names.client.send(new GetItemCommand({
    TableName: names.refunds,
    Key: { stripeCheckoutSessionId: { S: sessionId } }, ConsistentRead: true,
  }), { abortSignal: names.signal });
  if (!record) throw new MissingRefundCorrelation("MISSING_RESERVATION");
  const refundId = record.stripeRefundId?.S ?? null;
  return {
    sessionId, refundId,
    complaintId: record.origin?.S === "EXTERNAL_IMPORT" ? null : requiredString(record, "complaintId"),
    origin: record.origin?.S ?? "INTERNAL",
    customerId: record.origin?.S === "EXTERNAL_IMPORT" ? requiredString(record, "stripeCustomerId") : null,
    paymentIntentId: requiredString(record, "stripePaymentIntentId"),
    userId: requiredString(record, "userId"),
    amount: positiveNumber(record, "amount"),
    currency: requiredString(record, "currency"),
    status: requiredString(record, "status"),
    lastObservation: record.lastObservation?.N ? Number(record.lastObservation.N) : null,
  };
}
function assertSameAssociation(expected: RefundRecord, latest: RefundRecord, observedRefundId: string) {
  if (latest.origin !== expected.origin || latest.complaintId !== expected.complaintId ||
      latest.paymentIntentId !== expected.paymentIntentId || latest.userId !== expected.userId ||
      latest.amount !== expected.amount || latest.currency !== expected.currency || latest.customerId !== expected.customerId ||
      (latest.refundId !== null && latest.refundId !== observedRefundId) ||
      (expected.refundId !== null && latest.refundId !== expected.refundId)) {
    throw new RefundCorrelationIncident("ASSOCIATION_CHANGED");
  }
}
async function getPurchase(names: Names, sessionId: string): Promise<Item> {
  const result = await names.client.send(new GetItemCommand({
    TableName: names.purchases,
    Key: { stripeCheckoutSessionId: { S: sessionId } }, ConsistentRead: true,
  }), { abortSignal: names.signal });
  if (!result.Item) throw new Error("Purchased session missing from billing ledger.");
  return result.Item;
}
async function getEntitlement(names: Names, userId: string): Promise<Entitlement> {
  const { Item: item } = await names.client.send(new GetItemCommand({
    TableName: names.entitlements,
    Key: { userId: { S: userId } }, ConsistentRead: true,
  }), { abortSignal: names.signal });
  if (!item) throw new Error("Purchase has no entitlement; requires investigation.");
  const version = positiveNumber(item, "version");
  if (!Number.isSafeInteger(version + 1)) throw new Error("Entitlement version exhausted.");
  if (requiredString(item, "productCode") !== "PREMIUM") throw new Error("Unexpected entitlement product.");
  return {
    version,
    history: purchaseHistory(item),
    revokedReason: item.revocationReason?.S ?? null,
  };
}

/* The anchor is read before the immutable chain. Entitlement.version serializes
 * every checkout and successful refund; a concurrent commit invalidates this
 * snapshot at the final transaction. No GSI or paginated Query is involved.
 */
async function readAllPurchases(names: Names, userId: string, history: PurchaseHistory): Promise<Array<{item: Item; sessionId: string}>> {
  if (!history.verified) throw new Error("Purchase history is not verified; migration required before refund reconciliation.");
  if (history.count > MAX_PURCHASES_PER_USER) throw new Error("Too many purchases for automatic entitlement reconciliation.");
  const purchases: Array<{item: Item; sessionId: string}> = [];
  const sessions = new Set<string>();
  const payments = new Set<string>();
  let cursor = history.head;
  for (let sequence = history.count; sequence > 0; sequence--) {
    names.signal?.throwIfAborted();
    if (!cursor || !SESSION_PATTERN.test(cursor) || sessions.has(cursor)) throw new Error("Broken or cyclic purchase history.");
    const item = await getPurchase(names, cursor);
    const payment = requiredString(item, "stripePaymentIntentId");
    if (requiredString(item, "userId") !== userId || requiredString(item, "stripeCheckoutSessionId") !== cursor ||
        item.purchaseHistorySequence?.N !== String(sequence) || !PAYMENT_INTENT_PATTERN.test(payment) || payments.has(payment)) {
      throw new Error("Purchase history association or sequence mismatch.");
    }
    if (requiredString(item, "currency") !== "pln" ||
        !/^cus_[A-Za-z0-9]{8,220}$/.test(requiredString(item, "stripeCustomerId"))) {
      throw new Error("Invalid purchase financial association.");
    }
    positiveNumber(item, "amountTotal");
    const dates = ["paidAt", "grantedFrom", "grantedUntil"].map((field) => {
      const value = requiredString(item, field);
      const time = Date.parse(value);
      if (!Number.isFinite(time) || new Date(time).toISOString() !== value) {
        throw new Error("Invalid historical purchase timestamp.");
      }
      return time;
    });
    if (dates[1] < dates[0] || dates[2] !== dates[1] + positiveNumber(item, "accessDays") * 86_400_000) {
      throw new Error("Inconsistent historical purchase grant.");
    }
    // Validate even refunded/excluded rows; corruption must never be hidden by filtering.
    calculateSurvivingAccess([{
      stripeCheckoutSessionId: cursor, paidAt: requiredString(item, "paidAt"),
      grantedFrom: requiredString(item, "grantedFrom"), accessDays: positiveNumber(item, "accessDays"),
    }]);
    sessions.add(cursor);
    payments.add(payment);
    purchases.push({ item, sessionId: cursor });
    const previous = item.purchaseHistoryPrevious;
    if (!previous?.S && previous?.NULL !== true) throw new Error("Missing purchase history link.");
    cursor = previous.S ?? null;
  }
  if (cursor !== null) throw new Error("Purchase history count mismatch.");
  return purchases;
}

/** Read-only eligibility check. The reservation must fence this version transactionally.
 * A later refund observation always verifies the history again; this is not a certificate.
 */
export async function preflightRefundHistory(userId: string, sessionId?: string): Promise<number> {
  const signal = AbortSignal.timeout(6_000);
  const names = tableNames({ signal });
  const entitlement = await getEntitlement(names, userId);
  if (entitlement.revokedReason && entitlement.revokedReason !== "REFUND_RECONCILIATION") {
    throw new Error("Entitlement revoked for another reason; manual review required.");
  }
  const purchases = await readAllPurchases(names, userId, entitlement.history);
  if (sessionId && !purchases.some((purchase) => purchase.sessionId === sessionId)) {
    throw new Error("Refunded purchase missing from verified history.");
  }
  return entitlement.version;
}

// Bound concurrent reads as well as total records. No background writes.
async function boundedMap<T, R>(items: T[], read: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let offset = 0; offset < items.length; offset += 8) {
    results.push(...await Promise.all(items.slice(offset, offset + 8).map(read)));
  }
  return results;
}

export class RefundCorrelationIncident extends Error {
  constructor(public readonly reason: string) { super(reason); }
}

export class MissingRefundCorrelation extends Error {
  constructor(public readonly reason: "MISSING_METADATA" | "MISSING_RESERVATION") { super(reason); }
}

/** Only called after webhook signature and environment verification. No metadata or PII stored. */
export async function recordExternalRefundReview(refund: Stripe.Refund, eventId: string, reason: string, options: ReconciliationOptions = {}) {
  await recordEventOnly(tableNames(options), eventId, refund, "MANUAL_REVIEW_" + reason);
}

export type RefundObservation = { outcome: "SUCCEEDED" | "PENDING" | "FAILED" | "CANCELED" | "REQUIRES_ACTION" | "DUPLICATE"; refundId: string; };

/**
 * Applies one authoritative refund observation. For webhooks the event must
 * already be cryptographically verified by the Stripe SDK. For the manual
 * reconciliation Lambda the refund is freshly retrieved from Stripe API.
 * No new Refund POST is issued here.
 */
export async function applyRefundObservation(refund: Stripe.Refund, eventId: string, observationSeconds: number, externalSessionId?: string, options: ReconciliationOptions = {}): Promise<RefundObservation> {
  if (!/^evt_[A-Za-z0-9]{8,220}$/.test(eventId) && !/^manual_[A-Za-z0-9_-]{8,280}$/.test(eventId)) {
    throw new Error("Invalid observation identifier.");
  }
  if (!REFUND_PATTERN.test(refund.id)) throw new Error("Invalid Stripe refund ID.");
  if (!Number.isSafeInteger(observationSeconds) || observationSeconds <= 0) {
    throw new Error("Invalid Stripe observation timestamp.");
  }
  const sessionId = externalSessionId ?? refund.metadata?.stripeCheckoutSessionId;
  const complaintId = refund.metadata?.complaintId;
  if (!sessionId || !SESSION_PATTERN.test(sessionId) || (!externalSessionId && !complaintId)) {
    throw new MissingRefundCorrelation("MISSING_METADATA");
  }
  // SEC-002 supplies its request-wide budget. Other callers get a bounded
  // reconciliation budget below the shortest caller's 20s Lambda timeout.
  if (!options.signal) {
    const deadline = performance.now() + 12_000;
    const signal = AbortSignal.timeout(Math.max(0, Math.ceil(deadline - performance.now())));
    options = { ...options, signal, assertTransactionBudget: () => {
      signal.throwIfAborted();
      if (deadline - performance.now() <= 4_000) throw new Error("Insufficient reconciliation time; retry the same IDs. Earlier writes may have committed.");
    } };
  }
  const names = tableNames(options);
  const record = await getRefundRecord(names, sessionId);
  // Imported refunds always require fresh API verification through the ADMIN operation.
  if (!externalSessionId && record.origin === "EXTERNAL_IMPORT") throw new RefundCorrelationIncident("RESERVATION_ORIGIN_CONFLICT");
  if (
    (externalSessionId
      ? record.origin !== "EXTERNAL_IMPORT" || record.refundId !== refund.id || refund.status !== "succeeded"
      : record.origin === "EXTERNAL_IMPORT" || record.complaintId !== complaintId) ||
    !PAYMENT_INTENT_PATTERN.test(record.paymentIntentId) ||
    record.paymentIntentId !== normalizedPi(refund) ||
    record.currency !== refund.currency ||
    record.amount !== refund.amount ||
    (record.refundId !== null && record.refundId !== refund.id)
  ) {
    throw new RefundCorrelationIncident("RESERVATION_MISMATCH");
  }
  const purchase = await getPurchase(names, sessionId);
  if (
    requiredString(purchase, "stripePaymentIntentId") !== record.paymentIntentId ||
    requiredString(purchase, "userId") !== record.userId ||
    requiredString(purchase, "currency") !== record.currency ||
    positiveNumber(purchase, "amountTotal") !== record.amount ||
    (externalSessionId && requiredString(purchase, "stripeCustomerId") !== record.customerId)
  ) {
    throw new RefundCorrelationIncident("PURCHASE_MISMATCH");
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
      throw new RefundCorrelationIncident("SETTLED_STATE_CONFLICT");
    }
    await recordEventOnly(names, eventId, refund, "ALREADY_RECONCILED");
    return { outcome: "DUPLICATE", refundId: refund.id };
  }
  if (["FAILED", "CANCELED"].includes(record.status) && currentStripeStatus === "SUCCEEDED") {
    throw new RefundCorrelationIncident("TERMINAL_STATE_CONFLICT");
  }
  const now = new Date().toISOString();
  const statusValues = {
    ":newStatus": { S: currentStripeStatus },
    ":refundId": { S: refund.id },
    ":now": { S: now },
    ":pi": { S: record.paymentIntentId },
    ":amount": { N: String(record.amount) },
    ":externalOrigin": { S: "EXTERNAL_IMPORT" },
    ...(!externalSessionId ? { ":complaintId": { S: record.complaintId! } } : {}),
    ":observation": { N: String(observationSeconds) },
  };

  const associationCondition = externalSessionId
    ? "#origin = :externalOrigin AND stripeRefundId = :refundId"
    : "complaintId = :complaintId AND (attribute_not_exists(#origin) OR #origin <> :externalOrigin)";

  if (currentStripeStatus !== "SUCCEEDED") {
    if (["FAILED", "CANCELED"].includes(record.status)) {
      await recordEventOnly(names, eventId, refund, "TERMINAL_ALREADY_RECORDED");
      return { outcome: "DUPLICATE", refundId: refund.id };
    }
    try {
      names.assertTransactionBudget?.();
      await names.client.send(new TransactWriteItemsCommand({ TransactItems: [
        { Put: { TableName: names.events, Item: {
          eventId: { S: eventId }, eventType: { S: "REFUND_OBSERVATION" },
          stripeRefundId: { S: refund.id }, outcome: { S: currentStripeStatus },
          processedAt: { S: now },
        }, ConditionExpression: "attribute_not_exists(eventId)" } },
        { Update: { TableName: names.refunds,
          Key: { stripeCheckoutSessionId: { S: sessionId } },
          ConditionExpression: "#status <> :succeeded AND (attribute_not_exists(stripeRefundId) OR stripeRefundId = :refundId) AND (attribute_not_exists(lastObservation) OR lastObservation <= :observation) AND stripePaymentIntentId = :pi AND amount = :amount AND " + associationCondition,
          UpdateExpression: "SET #status = :newStatus, stripeRefundId = :refundId, stripeStatus = :newStatus, lastObservation = :observation, updatedAt = :now",
          ExpressionAttributeNames: { "#status": "status", "#origin": "origin" },
          ExpressionAttributeValues: { ...statusValues, ":succeeded": { S: "SUCCEEDED" } },
        } },
      ] }), { abortSignal: names.signal });
    } catch (error) {
      if ((error as {name?: string}).name === "TransactionCanceledException") {
        const latest = await getRefundRecord(names, sessionId);
        assertSameAssociation(record, latest, refund.id);
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
    assertSameAssociation(record, latest, refund.id);
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
    if (["FAILED", "CANCELED"].includes(latest.status)) throw new RefundCorrelationIncident("TERMINAL_STATE_CONFLICT");

    const entitlement = await getEntitlement(names, record.userId);
    if (entitlement.revokedReason && entitlement.revokedReason !== "REFUND_RECONCILIATION") {
      throw new Error("Entitlement already revoked for another reason; requires manual review.");
    }
    const allPurchases = await readAllPurchases(names, record.userId, entitlement.history);
    if (!allPurchases.some(({sessionId: id}) => id === sessionId)) throw new Error("Refunded purchase missing from verified history; requires investigation.");
    const candidates = await boundedMap(allPurchases.filter((purchase) => purchase.sessionId !== sessionId), async ({ item, sessionId: id }): Promise<PaidPurchase | null> => {
      const other = await names.client.send(new GetItemCommand({
        TableName: names.refunds,
        Key: { stripeCheckoutSessionId: { S: id } }, ConsistentRead: true,
        ProjectionExpression: "#status",
        ExpressionAttributeNames: { "#status": "status" },
      }), { abortSignal: names.signal });
      if (other.Item?.status?.S === "SUCCEEDED") return null;
      return {
        stripeCheckoutSessionId: id,
        paidAt: requiredString(item, "paidAt"),
        grantedFrom: requiredString(item, "grantedFrom"),
        accessDays: positiveNumber(item, "accessDays"),
      };
    });
    const survivors = candidates.filter((purchase): purchase is PaidPurchase => purchase !== null);
    const calculated = calculateSurvivingAccess(survivors);
    const noAccess = calculated.accessUntil === null;
    const updatePieces = ["accessUntil = :until", "updatedAt = :now", "#version = :next", "#source = :source"];
    const removals: string[] = [];
    const accessValues: Record<string, AttributeValue> = {
      ":until": { S: calculated.accessUntil ?? now },
      ":now": { S: now }, ":next": { N: String(entitlement.version + 1) },
      ":previous": { N: String(entitlement.version) },
      ":historyState": { S: "VERIFIED_V1" },
      ":historyHead": { S: entitlement.history.head! },
      ":historyCount": { N: String(entitlement.history.count) },
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
      names.assertTransactionBudget?.();
      await names.client.send(new TransactWriteItemsCommand({ TransactItems: [
        { Put: { TableName: names.events, Item: {
          eventId: { S: eventId }, eventType: { S: "REFUND_OBSERVATION" },
          stripeRefundId: { S: refund.id }, outcome: { S: "REFUND_SUCCEEDED" },
          processedAt: { S: now },
        }, ConditionExpression: "attribute_not_exists(eventId)" } },
        { Update: { TableName: names.refunds,
          Key: { stripeCheckoutSessionId: { S: sessionId } },
          ConditionExpression: "#status <> :succeeded AND (attribute_not_exists(stripeRefundId) OR stripeRefundId = :refundId) AND (attribute_not_exists(lastObservation) OR lastObservation <= :observation) AND stripePaymentIntentId = :pi AND amount = :amount AND " + associationCondition,
          UpdateExpression: "SET #status = :newStatus, stripeRefundId = :refundId, stripeStatus = :newStatus, lastObservation = :observation, updatedAt = :now, succeededAt = :now",
          ExpressionAttributeNames: { "#status": "status", "#origin": "origin" },
          ExpressionAttributeValues: { ...statusValues, ":succeeded": { S: "SUCCEEDED" } },
        } },
        { Update: { TableName: names.entitlements,
          Key: { userId: { S: record.userId } },
          ConditionExpression: "#version = :previous AND purchaseHistoryState = :historyState AND purchaseHistoryHead = :historyHead AND purchaseHistoryCount = :historyCount",
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: { "#version": "version", "#source": "source" },
          ExpressionAttributeValues: accessValues,
        } },
      ] }), { abortSignal: names.signal });
      return { outcome: "SUCCEEDED", refundId: refund.id };
    } catch (error) {
      if ((error as {name?: string}).name !== "TransactionCanceledException") throw error;
      const latestRecord = await getRefundRecord(names, sessionId);
      assertSameAssociation(record, latestRecord, refund.id);
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
