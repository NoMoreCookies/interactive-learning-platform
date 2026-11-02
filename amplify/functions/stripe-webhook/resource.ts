import {
  defineFunction,
  secret,
} from "@aws-amplify/backend";

/*
 * Stripe test/live mode is a deployment invariant, not a runtime default.
 *
 * Sandbox / test:
 *   STRIPE_EXPECTED_LIVEMODE=false
 *
 * Production:
 *   STRIPE_EXPECTED_LIVEMODE=true
 *
 * Missing or malformed configuration fails synthesis instead of silently
 * accepting the wrong class of Stripe events.
 */
const stripeExpectedLivemode =
  process.env
    .STRIPE_EXPECTED_LIVEMODE
    ?.trim();

if (
  stripeExpectedLivemode !== "true" &&
  stripeExpectedLivemode !== "false"
) {
  throw new Error(
    "STRIPE_EXPECTED_LIVEMODE must be explicitly configured as true or false for stripe-webhook.",
  );
}

// This is an audited migration identifier, NOT an ordinary feature flag.
// Default closed. See docs/ARCH-005-purchase-history.md before configuring.
const historyCutover = process.env.PURCHASE_HISTORY_CUTOVER_ID?.trim() ?? "";
if (historyCutover && !/^[A-Za-z0-9_-]{8,128}$/.test(historyCutover)) {
  throw new Error("Invalid PURCHASE_HISTORY_CUTOVER_ID audit reference.");
}

export const stripeWebhook =
  defineFunction({
    name: "stripe-webhook",
    entry: "./handler.ts",
    resourceGroupName: "data",
    timeoutSeconds: 20,

    environment: {
      PURCHASE_HISTORY_CUTOVER_ID: historyCutover,
      STRIPE_WEBHOOK_SECRET:
        secret(
          "STRIPE_WEBHOOK_SECRET",
        ),

      STRIPE_EXPECTED_LIVEMODE:
        stripeExpectedLivemode,
    },
  });
