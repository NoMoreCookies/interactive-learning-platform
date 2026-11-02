import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand, type AttributeValue } from "@aws-sdk/client-dynamodb";
import Stripe from "stripe";
import type { Schema } from "../resource";
import { assertAdmin, requireEnv, requiredString } from "../complaints/shared";
import { applyRefundObservation, recordExternalRefundReview, RefundCorrelationIncident } from "../../shared/refund-reconciliation";

// Injected by the function resource; no generated environment module required.
const env = { STRIPE_REFUND_READ_KEY: requireEnv("STRIPE_REFUND_READ_KEY"), STRIPE_EXPECTED_LIVEMODE: requireEnv("STRIPE_EXPECTED_LIVEMODE") };
const db = new DynamoDBClient({ maxAttempts: 1, requestHandler: { connectionTimeout: 1_000, requestTimeout: 3_000 } });
const stripe = new Stripe(env.STRIPE_REFUND_READ_KEY, { maxNetworkRetries: 0, timeout: 3_000 });
const sessionPattern = /^cs_(?:test|live)_[A-Za-z0-9]{8,220}$/;
const refundPattern = /^(?:re|pyr)_[A-Za-z0-9]{8,220}$/;
const id = (value: string | { id: string } | null) => typeof value === "string" ? value : value?.id;

export const handler: Schema["adminImportExternalRefund"]["functionHandler"] = async (event) => {
  // One budget covers all database reads, optimistic retries and the final transaction.
  // Aborted writes have an UNKNOWN outcome: propagate errors; retry the same IDs.
  const deadline = performance.now() + 22_000;
  const signal = AbortSignal.timeout(Math.max(0, Math.ceil(deadline - performance.now())));
  const assertTransactionBudget = () => {
    signal.throwIfAborted();
    // Allow the 3s DynamoDB request timeout plus 1s before the shared cutoff.
    // This only prevents a NEW write; any earlier write may already have committed.
    if (deadline - performance.now() <= 4_000) {
      throw new Error("Insufficient import time remaining; outcome may be unknown. Retry the same purchase/refund IDs.");
    }
  };
  const adminId = assertAdmin(event.identity);
  const { stripeCheckoutSessionId: sessionId, stripeRefundId: refundId, confirmationSessionId, confirmationRefundId } = event.arguments;
  if (!sessionPattern.test(sessionId) || !refundPattern.test(refundId) ||
      sessionId !== confirmationSessionId || refundId !== confirmationRefundId) {
    throw new Error("Nieprawidłowe potwierdzenie zakupu i istniejącego zwrotu.");
  }
  const mode = env.STRIPE_EXPECTED_LIVEMODE;
  if ((mode !== "true" && mode !== "false") ||
      !env.STRIPE_REFUND_READ_KEY.startsWith(mode === "true" ? "rk_live_" : "rk_test_") ||
      !sessionId.startsWith(mode === "true" ? "cs_live_" : "cs_test_")) {
    throw new Error("Invalid Stripe read-only environment configuration.");
  }
  const purchases = requireEnv("BILLING_PURCHASE_TABLE_NAME");
  const refunds = requireEnv("BILLING_REFUND_TABLE_NAME");
  const events = requireEnv("STRIPE_EVENT_TABLE_NAME");
  const key = { stripeCheckoutSessionId: { S: sessionId } };
  const { Item: purchase } = await db.send(new GetItemCommand({ TableName: purchases, Key: key, ConsistentRead: true }), { abortSignal: signal });
  if (!purchase) throw new Error("Nie znaleziono zakupu w lokalnej księdze.");
  const userId = requiredString(purchase, "userId");
  const customerId = requiredString(purchase, "stripeCustomerId");
  const piId = requiredString(purchase, "stripePaymentIntentId");
  const currency = requiredString(purchase, "currency");
  const amount = Number(purchase.amountTotal?.N);
  if (requiredString(purchase, "stripeCheckoutSessionId") !== sessionId || !/^pi_[A-Za-z0-9]{8,220}$/.test(piId) ||
      !Number.isSafeInteger(amount) || amount <= 0 || !/^[a-z]{3}$/.test(currency)) {
    throw new Error("Nieprawidłowy zapis zakupu.");
  }
  const review = async (reason: string) => {
    // A bounded key per refund/purchase/reason, never client text or Stripe error messages.
    await recordExternalRefundReview({ id: refundId } as Stripe.Refund, `${reason === "CONFLICT" ? "incident_import" : "import"}_${sessionId}_${refundId}_${reason}`, reason, { client: db, signal });
    return { status: `MANUAL_REVIEW_${reason}`, stripeRefundId: refundId };
  };
  let refund: Stripe.Refund;
  try {
    refund = await stripe.refunds.retrieve(refundId);
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "resource_missing") return review("UNKNOWN_REFUND");
    throw error;
  }
  if (!id(refund.payment_intent)) return review("MISSING_PAYMENT_INTENT");
  if (refund.id !== refundId || id(refund.payment_intent) !== piId) return review("PAYMENT_MISMATCH");
  let pi: Stripe.PaymentIntent;
  try { pi = await stripe.paymentIntents.retrieve(piId); }
  catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "resource_missing") return review("MISSING_PAYMENT");
    throw error;
  }
  if (pi.id !== piId || pi.livemode !== (mode === "true") || pi.status !== "succeeded" ||
      id(pi.customer) !== customerId || pi.amount !== amount || pi.amount_received !== amount ||
      pi.currency !== currency || refund.currency !== currency) return review("PAYMENT_MISMATCH");
  // Verify that the selected immutable local session is the actual Stripe payment,
  // not another local purchase accidentally associated with the same PaymentIntent.
  let checkout: Stripe.Checkout.Session;
  try { checkout = await stripe.checkout.sessions.retrieve(sessionId); }
  catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "resource_missing") return review("CHECKOUT_MISMATCH");
    throw error;
  }
  if (checkout.id !== sessionId || checkout.livemode !== (mode === "true") || checkout.mode !== "payment" ||
      checkout.payment_status !== "paid" || id(checkout.payment_intent) !== piId || id(checkout.customer) !== customerId ||
      checkout.amount_total !== amount || checkout.currency !== currency) return review("CHECKOUT_MISMATCH");
  if (refund.amount !== amount) return review("PARTIAL_OR_AMOUNT");
  if (refund.status !== "succeeded") return review("NOT_SUCCEEDED");
  const existing = await stripe.refunds.list({ payment_intent: piId, limit: 100 });
  if (existing.has_more || existing.data.length !== 1 || existing.data[0].id !== refundId ||
      existing.data[0].status !== "succeeded" || existing.data[0].amount !== amount ||
      existing.data[0].currency !== currency || id(existing.data[0].payment_intent) !== piId) return review("MULTIPLE_OR_AMBIGUOUS");

  const getReserved = async () => (await db.send(new GetItemCommand({ TableName: refunds, Key: key, ConsistentRead: true }), { abortSignal: signal })).Item;
  const matches = (item: Record<string, AttributeValue>) => item.origin?.S === "EXTERNAL_IMPORT" &&
    item.stripeRefundId?.S === refundId && item.stripePaymentIntentId?.S === piId && item.userId?.S === userId &&
    item.stripeCustomerId?.S === customerId && item.amount?.N === String(amount) && item.currency?.S === currency;
  const prior = await getReserved();
  if (prior && !matches(prior)) return review("CONFLICT");
  if (!prior) {
    const now = new Date().toISOString();
    try {
      assertTransactionBudget();
      await db.send(new TransactWriteItemsCommand({ TransactItems: [
        { ConditionCheck: { TableName: purchases, Key: key,
          ConditionExpression: "userId = :user AND stripeCustomerId = :customer AND stripePaymentIntentId = :pi AND amountTotal = :amount AND currency = :currency",
          ExpressionAttributeValues: { ":user": { S: userId }, ":customer": { S: customerId }, ":pi": { S: piId }, ":amount": { N: String(amount) }, ":currency": { S: currency } },
        } },
        { Put: { TableName: refunds, ConditionExpression: "attribute_not_exists(stripeCheckoutSessionId)", Item: {
          ...key, origin: { S: "EXTERNAL_IMPORT" }, stripeRefundId: { S: refundId }, stripePaymentIntentId: { S: piId },
          userId: { S: userId }, stripeCustomerId: { S: customerId }, adminId: { S: adminId }, amount: { N: String(amount) },
          currency: { S: currency }, status: { S: "AWAITING_RECONCILIATION" }, createdAt: { S: now }, updatedAt: { S: now },
        } } },
        // Independent conditional claims prevent the same Stripe refund/PI being attached to another purchase.
        ...[`refund_link_${refundId}`, `refund_pi_${piId}`].map((eventId) => ({ Put: {
          TableName: events, ConditionExpression: "attribute_not_exists(eventId)",
          Item: { eventId: { S: eventId }, stripeCheckoutSessionId: { S: sessionId }, stripeRefundId: { S: refundId } },
        } })),
      ] }), { abortSignal: signal });
    } catch (error) {
      if ((error as { name?: string }).name !== "TransactionCanceledException") throw error;
      const competing = await getReserved();
      if (!competing || !matches(competing)) {
        // Infrastructure cancellations must propagate; only proven claim conflicts are review outcomes.
        const claims = await Promise.all([`refund_pi_${piId}`, `refund_link_${refundId}`].map((eventId) =>
          db.send(new GetItemCommand({ TableName: events, Key: { eventId: { S: eventId } }, ConsistentRead: true }), { abortSignal: signal }),
        ));
        if (competing || claims.some(({ Item }) => Item &&
            (Item.stripeCheckoutSessionId?.S !== sessionId || Item.stripeRefundId?.S !== refundId))) return review("CONFLICT");
        throw error;
      }
    }
  }
  // Only this module supplies externalSessionId, after authoritative read-only Stripe verification.
  let result;
  try {
    result = await applyRefundObservation(refund, `manual_external_${refundId}_succeeded`, Math.floor(Date.now() / 1000), sessionId, { client: db, signal, assertTransactionBudget });
  } catch (error) {
    if (error instanceof RefundCorrelationIncident) {
      await recordExternalRefundReview(refund, `incident_import_${sessionId}_${refundId}_${error.reason}`, error.reason, { client: db, signal });
      console.error("Refund correlation incident", { refundId, reason: error.reason });
    }
    throw error;
  }
  return { status: result.outcome === "DUPLICATE" ? "ALREADY_RECONCILED" : result.outcome, stripeRefundId: refundId };
};
