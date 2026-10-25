import { defineFunction, secret } from "@aws-amplify/backend";

const stripeExpectedLivemode = process.env.STRIPE_EXPECTED_LIVEMODE?.trim();
if (stripeExpectedLivemode !== "true" && stripeExpectedLivemode !== "false") {
  throw new Error("STRIPE_EXPECTED_LIVEMODE must be explicitly configured for reconciliation.");
}

/** ADMIN-only read-only Stripe observation. Does NOT issue a new refund POST. */
export const adminReconcileRefund = defineFunction({
  name: "admin-reconcile-refund",
  entry: "./handler.ts",
  resourceGroupName: "data",
  timeoutSeconds: 60,
  environment: {
    STRIPE_REFUND_READ_KEY: secret("STRIPE_REFUND_READ_KEY"),
    STRIPE_EXPECTED_LIVEMODE: stripeExpectedLivemode,
  },
});
