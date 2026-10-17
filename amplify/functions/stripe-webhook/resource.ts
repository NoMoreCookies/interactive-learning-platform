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

export const stripeWebhook =
  defineFunction({
    name: "stripe-webhook",
    entry: "./handler.ts",
    resourceGroupName: "data",

    environment: {
      STRIPE_WEBHOOK_SECRET:
        secret(
          "STRIPE_WEBHOOK_SECRET",
        ),

      STRIPE_EXPECTED_LIVEMODE:
        stripeExpectedLivemode,
    },
  });
