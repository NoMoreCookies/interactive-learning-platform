import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import Stripe from "stripe";
import { env } from "$amplify/env/admin-reconcile-refund";
import type { Schema } from "../resource";
import { assertAdmin, requireEnv } from "../complaints/shared";
import { applyRefundObservation } from "../../shared/refund-reconciliation";

const db = new DynamoDBClient({});
const stripe = new Stripe(env.STRIPE_REFUND_READ_KEY, { maxNetworkRetries: 0, timeout: 10_000 });
const sessionPattern = /^cs_(?:test|live)_[A-Za-z0-9]{8,220}$/;

export const handler: Schema["adminReconcileRefund"]["functionHandler"] = async (event) => {
  assertAdmin(event.identity);
  const sessionId = event.arguments.stripeCheckoutSessionId;
  if (!sessionPattern.test(sessionId)) throw new Error("Nieprawidłowy zakup.");
  const expectedMode = env.STRIPE_EXPECTED_LIVEMODE;
  if (expectedMode !== "true" && expectedMode !== "false") throw new Error("Invalid Stripe mode configuration.");
  /* A separate restricted read-only Stripe key reduces impact if this Lambda
   * is ever compromised. Its permissions must allow GET refunds and GET PIs.
   */
  const expectedPrefix = expectedMode === "true" ? "rk_live_" : "rk_test_";
  if (!env.STRIPE_REFUND_READ_KEY.startsWith(expectedPrefix)) {
    throw new Error("Reconciliation requires a restricted Stripe read key matching the environment.");
  }
  const table = requireEnv("BILLING_REFUND_TABLE_NAME");
  const result = await db.send(new GetItemCommand({
    TableName: table,
    Key: { stripeCheckoutSessionId: { S: sessionId } },
    ConsistentRead: true,
  }));
  const item = result.Item;
  if (!item || !item.stripePaymentIntentId?.S || !item.complaintId?.S) {
    throw new Error("Brak zarejestrowanego zwrotu dla tego zakupu.");
  }
  const refundId = item.stripeRefundId?.S;
  let refund: Stripe.Refund | undefined;
  if (refundId) {
    refund = await stripe.refunds.retrieve(refundId);
  } else {
    /* A timed-out POST may have succeeded. Read-only search is safe; a new POST is NOT. */
    const result = await stripe.refunds.list({
      payment_intent: item.stripePaymentIntentId.S,
      limit: 100,
    });
    if (result.has_more) throw new Error("Zbyt wiele zwrotów — wymagana ręczna kontrola Stripe.");
    const candidates = result.data.filter((candidate) =>
      candidate.metadata?.stripeCheckoutSessionId === sessionId &&
      candidate.metadata?.complaintId === item.complaintId?.S
    );
    if (candidates.length > 1) throw new Error("Wykryto wiele zwrotów Stripe — wymagana ręczna kontrola.");
    if (candidates.length === 0) {
      return { status: "RECONCILIATION_REQUIRED", stripeRefundId: null };
    }
    refund = candidates[0];
  }
  if (!refund) throw new Error("Nie znaleziono zwrotu Stripe.");
  /* Refund objects do not guarantee a livemode property. Verify through the
   * underlying PaymentIntent, which does include livemode, using the same
   * Stripe account's read-only credentials.
   */
  const paymentIntent = await stripe.paymentIntents.retrieve(item.stripePaymentIntentId.S);
  if (paymentIntent.livemode !== (expectedMode === "true")) {
    throw new Error("Stripe payment environment mismatch.");
  }
  const observed = await applyRefundObservation(
    refund,
    `manual_${refund.id}_${refund.status}`,
    Math.floor(Date.now() / 1000),
  );
  return { status: observed.outcome, stripeRefundId: observed.refundId };
};
