import { defineFunction, secret } from "@aws-amplify/backend";

/* Stripe TEST/LIVE mode is an explicit deployment invariant. */
const stripeExpectedLivemode = process.env.STRIPE_EXPECTED_LIVEMODE?.trim();
if (stripeExpectedLivemode !== "true" && stripeExpectedLivemode !== "false") {
  throw new Error("STRIPE_EXPECTED_LIVEMODE must be explicitly configured for refunds.");
}

/* By default refunds are OFF. Explicit opt-in is allowed only for Stripe TEST.
 * Enabling LIVE will require a separate reviewed production release.
 */
const requestedRefundEnable = process.env.REFUND_EXECUTION_ENABLED?.trim() === "true";
if (requestedRefundEnable && stripeExpectedLivemode !== "false") {
  throw new Error("Refund execution can only be enabled in Stripe TEST during C2/C3 verification.");
}

export const adminInitiateRefund = defineFunction({
  name: "admin-initiate-refund",
  entry: "./handler.ts",
  resourceGroupName: "data",
  timeoutSeconds: 30,
  environment: {
    STRIPE_SECRET_KEY: secret("STRIPE_SECRET_KEY"),
    STRIPE_EXPECTED_LIVEMODE: stripeExpectedLivemode,
    REFUND_EXECUTION_ENABLED: requestedRefundEnable ? "true" : "false",
  },
});
