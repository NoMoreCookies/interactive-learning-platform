import {
  defineFunction,
  secret,
} from "@aws-amplify/backend";

export const createCheckoutSession =
  defineFunction({
    name: "create-checkout-session",
    entry: "./handler.ts",
    resourceGroupName: "data",

    environment: {
      STRIPE_SECRET_KEY:
        secret("STRIPE_SECRET_KEY"),

      STRIPE_PRICE_ONE_MONTH:
        secret(
          "STRIPE_PRICE_ONE_MONTH",
        ),

      APP_BASE_URL:
        process.env.APP_BASE_URL ??
        "http://localhost:3000",
    },
  });