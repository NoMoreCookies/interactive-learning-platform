import {
  defineFunction,
  secret,
} from "@aws-amplify/backend";

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

      STRIPE_PRICE_ONE_MONTH:
        secret(
          "STRIPE_PRICE_ONE_MONTH",
        ),

      STRIPE_EXPECTED_LIVEMODE:
        process.env
          .STRIPE_EXPECTED_LIVEMODE ??
        "false",
    },
  });