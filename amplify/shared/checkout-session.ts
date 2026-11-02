import { createHash } from "node:crypto";
import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand, UpdateItemCommand, type AttributeValue, type UpdateItemCommandInput } from "@aws-sdk/client-dynamodb";
import type Stripe from "stripe";
import { ResolverBudget } from "./resolver-budget";

// Shorter than Stripe's minimum 24h idempotency retention. Beyond this window
// an unknown POST stays blocked for manual reconciliation, never a fresh POST.
export const CHECKOUT_REPLAY_WINDOW_MS = 23 * 60 * 60 * 1000;
export type CheckoutContract = {
  purchaseIntentId: string; userId: string; stripeCustomerId: string; planCode: string;
  billingContractVersion: string; stripePriceId: string; amountTotal: number;
  currency: string; accessDays: number; termsVersion: string; privacyVersion: string;
  checkoutConsentVersion: string; appBaseUrl: string; livemode: boolean;
};
export type CheckoutRecoveryResult =
  | { status: "READY"; url: string; sessionId: string }
  | { status: "COMPLETED"; sessionId: string }
  | { status: "EXPIRED" };
type Item = Record<string, AttributeValue>;
// Allowed predecessors for recovery writes. Terminal states have no outgoing
// recovery transitions. PAYMENT_FAILED is committed by the signed webhook;
// financial PAID remains independently protected by every status condition.
const lifecyclePredecessors = {
  NOT_STARTED: [],
  CREATING: ["NOT_STARTED"],
  SESSION_KNOWN: ["CREATING", "SESSION_KNOWN"],
  READY: ["CREATING", "SESSION_KNOWN", "READY"],
  EXPIRED: ["CREATING", "SESSION_KNOWN", "READY", "EXPIRED"],
  NOT_STARTED_EXPIRED: ["NOT_STARTED"],
  PAYMENT_FAILED: [],
} as const;

async function writeLifecycle(db: DynamoDBClient, input: UpdateItemCommandInput,
  target: keyof typeof lifecyclePredecessors): Promise<void> {
  const sources: readonly string[] = lifecyclePredecessors[target];
  const values = Object.fromEntries(sources.map((state, index) => [`:source${index}`, { S: state }]));
  try {
    await db.send(new UpdateItemCommand({
      ...input,
      ConditionExpression: `${input.ConditionExpression} AND sessionCreationState IN (${Object.keys(values).join(", ")})`,
      ExpressionAttributeValues: { ...input.ExpressionAttributeValues, ...values },
    }));
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "ConditionalCheckFailedException") throw error;
    // Do not restart resolution: that could replay a POST or accept a stale
    // Stripe snapshot. A later request must obtain fresh authoritative evidence.
    const { Item: latest } = await db.send(new GetItemCommand({
      TableName: input.TableName, Key: input.Key, ConsistentRead: true,
    }));
    throw new Error(`Checkout lifecycle conflict; retry/reconciliation required (${latest?.status?.S ?? "missing"}/${latest?.sessionCreationState?.S ?? "missing"}).`, { cause: error });
  }
}

export function checkoutAttemptKey(userId: string, intentId: string): string {
  return "checkout_" + createHash("sha256").update(JSON.stringify([userId, intentId])).digest("hex");
}
type Dependencies = {
  db: DynamoDBClient; stripe: Stripe; attemptsTable: string; customersTable: string;
  budget: ResolverBudget;
};
const text = (item: Item, key: string): string => {
  const value = item[key]?.S;
  if (!value) throw new Error(`Invalid checkout attempt field: ${key}`);
  return value;
};
const objectId = (value: string | { id: string } | null) => typeof value === "string" ? value : value?.id;

function metadata(contract: CheckoutContract, attemptId: string) {
  return {
    checkoutAttemptId: attemptId, appUserId: contract.userId, planCode: contract.planCode,
    billingContractVersion: contract.billingContractVersion, stripePriceId: contract.stripePriceId,
    termsVersion: contract.termsVersion, privacyVersion: contract.privacyVersion,
    checkoutConsentVersion: contract.checkoutConsentVersion,
  };
}

export function sessionParameters(contract: CheckoutContract, attemptId: string, createdAt: number): Stripe.Checkout.SessionCreateParams {
  const tags = metadata(contract, attemptId);
  return {
    mode: "payment", customer: contract.stripeCustomerId, client_reference_id: contract.userId,
    line_items: [{ price: contract.stripePriceId, quantity: 1 }],
    success_url: `${contract.appBaseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${contract.appBaseUrl}/checkout/cancel`, locale: "pl",
    // Stable across retries, and bounds the lifetime of abandoned open sessions.
    expires_at: Math.floor(createdAt / 1000) + 2 * 60 * 60,
    metadata: tags, payment_intent_data: { metadata: tags },
  };
}

export function verifyCheckoutSession(session: Stripe.Checkout.Session, item: Item, expected: CheckoutContract): void {
  const attemptId = text(item, "checkoutAttemptId");
  const lines = session.line_items;
  if (text(item, "userId") !== expected.userId || text(item, "stripeCustomerId") !== expected.stripeCustomerId ||
      session.livemode !== expected.livemode || session.mode !== "payment" ||
      session.client_reference_id !== expected.userId || objectId(session.customer) !== expected.stripeCustomerId ||
      session.currency !== text(item, "currency") || session.amount_total !== Number(item.amountTotal?.N) ||
      !session.id.startsWith(expected.livemode ? "cs_live_" : "cs_test_") ||
      !lines || lines.has_more || lines.data.length !== 1 || lines.data[0].quantity !== 1 ||
      objectId(lines.data[0].price) !== text(item, "stripePriceId")) {
    throw new Error("Recovered checkout does not match the trusted purchase contract.");
  }
  for (const [key, value] of Object.entries({
    checkoutAttemptId: attemptId, appUserId: text(item, "userId"),
    planCode: text(item, "planCode"), billingContractVersion: text(item, "billingContractVersion"),
    stripePriceId: text(item, "stripePriceId"), termsVersion: text(item, "termsVersion"),
    privacyVersion: text(item, "privacyVersion"), checkoutConsentVersion: text(item, "checkoutConsentVersion"),
  })) {
    if (session.metadata?.[key] !== value) throw new Error("Recovered checkout metadata mismatch.");
  }
  if (item.stripeCheckoutSessionId?.S && item.stripeCheckoutSessionId.S !== session.id) {
    throw new Error("Checkout session association changed.");
  }
}

function attemptItem(contract: CheckoutContract, attemptId: string, now: number): Item {
  const timestamp = new Date(now).toISOString();
  const strings = {
    checkoutAttemptId: attemptId, purchaseIntentId: contract.purchaseIntentId, userId: contract.userId, stripeCustomerId: contract.stripeCustomerId,
    planCode: contract.planCode, billingContractVersion: contract.billingContractVersion,
    stripePriceId: contract.stripePriceId, currency: contract.currency, checkoutMode: "payment",
    termsVersion: contract.termsVersion, privacyVersion: contract.privacyVersion,
    checkoutConsentVersion: contract.checkoutConsentVersion,
    consentedAt: timestamp, createdAt: timestamp, updatedAt: timestamp,
    status: "CREATED", sessionCreationState: "NOT_STARTED",
    sessionParameters: JSON.stringify(sessionParameters(contract, attemptId, now)),
  };
  return {
    ...Object.fromEntries(Object.entries(strings).map(([key, value]) => [key, { S: value }])),
    stripeLivemode: { BOOL: contract.livemode },
    amountTotal: { N: String(contract.amountTotal) }, accessDays: { N: String(contract.accessDays) },
    immediateDeliveryConsent: { BOOL: true }, withdrawalRightLossAcknowledged: { BOOL: true },
  };
}

/** One protected intent per user across tabs/devices. The pointer has no TTL:
 * limiter expiry must never erase an ambiguous payment operation.
 */
export async function recoverOrCreateCheckout(deps: Dependencies, contract: CheckoutContract): Promise<CheckoutRecoveryResult> {
  const { db, attemptsTable, customersTable, budget } = deps;
  const attemptId = checkoutAttemptKey(contract.userId, contract.purchaseIntentId);
  const customerKey = { userId: { S: contract.userId } };
  const { Item: customer } = await db.send(new GetItemCommand({
    TableName: customersTable, Key: customerKey, ConsistentRead: true,
  }));
  if (customer?.stripeCustomerId?.S !== contract.stripeCustomerId) throw new Error("Billing customer changed.");
  // Legacy customers may still own sessions created before durable pointers.
  // Absence alone is NOT proof of no active checkout. No automatic migration.
  if (customer.checkoutRecoveryReady?.BOOL !== true) {
    throw new Error("Legacy checkout inventory must be reconciled before starting a protected checkout.");
  }
  const previous = customer.activeCheckoutAttemptId?.S;
  let item: Item | undefined;
  // Deterministic key remembers the same intent even after the active pointer
  // has moved to a later purchase. A delayed retry cannot become a new purchase.
  const known = await db.send(new GetItemCommand({ TableName: attemptsTable,
    Key: { checkoutAttemptId: { S: attemptId } }, ConsistentRead: true }));
  if (known.Item) {
    const resolved = await resolveAttempt(deps, known.Item, contract);
    return resolved ?? { status: "EXPIRED" };
  }
  if (previous) {
    const result = await db.send(new GetItemCommand({
      TableName: attemptsTable, Key: { checkoutAttemptId: { S: previous } }, ConsistentRead: true,
    }));
    item = result.Item;
    if (!item || item.checkoutAttemptId?.S !== previous || item.userId?.S !== contract.userId ||
        item.stripeCustomerId?.S !== contract.stripeCustomerId) throw new Error("Invalid active checkout pointer; reconciliation required.");
    const resolved = await resolveAttempt(deps, item, contract);
    if (resolved?.status === "READY") throw new Error("Inna sesja płatności jest aktywna. Wróć do poprzedniej sesji lub poczekaj na jej wygaśnięcie.");
    // Only authoritative expiry, paid webhook commit, or confirmed failed payment
    // permits rotating the pointer. No deletion of historical attempts.
  }
  item = attemptItem(contract, attemptId, Date.now());
  budget.require(14_000);
  await db.send(new TransactWriteItemsCommand({ TransactItems: [
    { Put: { TableName: attemptsTable, Item: item, ConditionExpression: "attribute_not_exists(checkoutAttemptId)" } },
    { Update: { TableName: customersTable, Key: customerKey,
      UpdateExpression: "SET activeCheckoutAttemptId = :attempt",
      ConditionExpression: "stripeCustomerId = :customer AND checkoutRecoveryReady = :ready AND " + (previous ? "activeCheckoutAttemptId = :previous" : "attribute_not_exists(activeCheckoutAttemptId)"),
      ExpressionAttributeValues: { ":ready": { BOOL: true }, ":customer": { S: contract.stripeCustomerId }, ":attempt": { S: attemptId },
        ...(previous ? { ":previous": { S: previous } } : {}),
      },
    } },
  ] }));
  return await resolveAttempt(deps, item, contract) ?? { status: "EXPIRED" };
}

async function resolveAttempt(deps: Dependencies, item: Item, contract: CheckoutContract): Promise<CheckoutRecoveryResult | null> {
  const { db, stripe, attemptsTable, budget } = deps;
  const attemptId = text(item, "checkoutAttemptId");
  if (item.userId?.S !== contract.userId || item.stripeCustomerId?.S !== contract.stripeCustomerId ||
      item.stripeLivemode?.BOOL !== contract.livemode) {
    throw new Error("Stored checkout owner/customer/environment mismatch.");
  }
  const key = { checkoutAttemptId: { S: attemptId } };
  let sessionId = item.stripeCheckoutSessionId?.S;
  if (!sessionId) {
    if (text(item, "status") !== "CREATED") throw new Error("Paid checkout missing session ID.");
    const state = text(item, "sessionCreationState");
    if (state === "NOT_STARTED_EXPIRED") return null;
    if (!["NOT_STARTED", "CREATING"].includes(state)) throw new Error("Unknown checkout creation state.");
    const created = Date.parse(text(item, "createdAt"));
    if (!Number.isFinite(created) || created > Date.now()) throw new Error("Invalid checkout creation time.");
    if (state === "NOT_STARTED" && Date.now() - created >= 60 * 60 * 1000) {
      // Fence any stale invocation BEFORE permitting pointer rotation. This also
      // avoids first creating a session with an expires_at less than 30m away.
      await writeLifecycle(db, { TableName: attemptsTable, Key: key,
        UpdateExpression: "SET sessionCreationState = :retired",
        ConditionExpression: "#status = :created AND sessionCreationState = :notStarted AND attribute_not_exists(stripeCheckoutSessionId)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":retired": { S: "NOT_STARTED_EXPIRED" }, ":created": { S: "CREATED" }, ":notStarted": { S: "NOT_STARTED" } },
      }, "NOT_STARTED_EXPIRED");
      return null;
    }
    if (Date.now() - created >= CHECKOUT_REPLAY_WINDOW_MS) {
      throw new Error("Checkout outcome requires manual reconciliation; replay window elapsed.");
    }
    // Reserve POST + fresh GET + persistence + final consistency read.
    budget.require(12_000);
    if (state === "NOT_STARTED") {
      await writeLifecycle(db, { TableName: attemptsTable, Key: key,
        UpdateExpression: "SET sessionCreationState = :creating",
        ConditionExpression: "#status = :created AND sessionCreationState = :notStarted",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":creating": { S: "CREATING" }, ":notStarted": { S: "NOT_STARTED" }, ":created": { S: "CREATED" } },
      }, "CREATING");
    }
    // Immutable serialized request survives price, legal and APP_BASE_URL deploys.
    // No automatic SDK retry; a later user request replays exactly this operation.
    const params = JSON.parse(text(item, "sessionParameters")) as Stripe.Checkout.SessionCreateParams;
    const session = await stripe.checkout.sessions.create(params, {
      idempotencyKey: `poprostumatma:checkout:${attemptId}`, timeout: 4_000, maxNetworkRetries: 0,
    });
    sessionId = session.id;
    // Persist the known ID BEFORE further external reads. A lost response is
    // recovered by replay; a webhook may already have committed PAID instead.
    await writeLifecycle(db, { TableName: attemptsTable, Key: key,
      UpdateExpression: "SET stripeCheckoutSessionId = :session, sessionCreationState = :known",
      ConditionExpression: "#status = :created AND (attribute_not_exists(stripeCheckoutSessionId) OR stripeCheckoutSessionId = :session)",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":session": { S: sessionId }, ":known": { S: "SESSION_KNOWN" }, ":created": { S: "CREATED" } },
    }, "SESSION_KNOWN");
  }
  budget.require(6_000);
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] }, { timeout: 2_500, maxNetworkRetries: 0 });
  verifyCheckoutSession(session, item, contract);
  const { Item: latest } = await db.send(new GetItemCommand({ TableName: attemptsTable, Key: key, ConsistentRead: true }));
  if (!latest || (latest.stripeCheckoutSessionId?.S && latest.stripeCheckoutSessionId.S !== session.id)) throw new Error("Checkout association changed.");
  if (session.status === "expired") {
    if (session.payment_status !== "unpaid" || latest.status?.S === "PAID") throw new Error("Expired checkout has conflicting payment state.");
    await writeLifecycle(db, { TableName: attemptsTable, Key: key,
      UpdateExpression: "SET stripeCheckoutSessionId = :session, sessionCreationState = :expired",
      ConditionExpression: "#status = :created AND (attribute_not_exists(stripeCheckoutSessionId) OR stripeCheckoutSessionId = :session)",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":session": { S: session.id }, ":expired": { S: "EXPIRED" }, ":created": { S: "CREATED" } },
    }, "EXPIRED");
    return null;
  }
  if (session.status === "complete") {
    if (latest.status?.S === "PAID" && latest.stripeCheckoutSessionId?.S === session.id) return { status: "COMPLETED", sessionId: session.id };
    if (session.payment_status === "unpaid" && latest.sessionCreationState?.S === "PAYMENT_FAILED") return null;
    throw new Error("Płatność jest przetwarzana. Sprawdź status zakupu przed kolejną próbą.");
  }
  if (session.status !== "open" || session.payment_status !== "unpaid" || latest.status?.S !== "CREATED" ||
      session.expires_at * 1000 <= Date.now() || !session.url?.startsWith("https://checkout.stripe.com/")) {
    throw new Error("Checkout is not active.");
  }
  // An existing active session must match the currently selected offer/consents.
  // Mismatched open attempts remain protected until they expire; never duplicate.
  if (text(item, "planCode") !== contract.planCode || text(item, "stripePriceId") !== contract.stripePriceId ||
      Number(item.amountTotal?.N) !== contract.amountTotal || text(item, "currency") !== contract.currency ||
      text(item, "termsVersion") !== contract.termsVersion || text(item, "privacyVersion") !== contract.privacyVersion ||
      text(item, "checkoutConsentVersion") !== contract.checkoutConsentVersion ||
      text(item, "billingContractVersion") !== contract.billingContractVersion) {
    throw new Error("Poprzednia sesja ma inne warunki. Poczekaj na jej wygaśnięcie lub skontaktuj się z obsługą.");
  }
  await writeLifecycle(db, { TableName: attemptsTable, Key: key,
    UpdateExpression: "SET stripeCheckoutSessionId = :session, sessionCreationState = :ready, updatedAt = :now",
    ConditionExpression: "#status = :created AND (attribute_not_exists(stripeCheckoutSessionId) OR stripeCheckoutSessionId = :session)",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: { ":session": { S: session.id }, ":ready": { S: "READY" }, ":created": { S: "CREATED" }, ":now": { S: new Date().toISOString() } },
  }, "READY");
  return { status: "READY", url: session.url, sessionId: session.id };
}
