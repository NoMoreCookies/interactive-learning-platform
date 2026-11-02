import {
  defineFunction,
  secret,
} from "@aws-amplify/backend";

const appBaseUrl =
  process.env.APP_BASE_URL?.trim();
const expectedLivemode =
  process.env.STRIPE_EXPECTED_LIVEMODE?.trim();

if (
  expectedLivemode !== "true" &&
  expectedLivemode !== "false"
) {
  throw new Error(
    "STRIPE_EXPECTED_LIVEMODE must be explicitly set to true or false.",
  );
}

if (!appBaseUrl) {
  throw new Error(
    "APP_BASE_URL must be configured for create-checkout-session.",
  );
}

export const createCheckoutSession =
  defineFunction({
    name: "create-checkout-session",
    entry: "./handler.ts",
    resourceGroupName: "data",
    timeoutSeconds: 28,

    environment: {
      STRIPE_SECRET_KEY:
        secret("STRIPE_SECRET_KEY"),

      STRIPE_PRICE_ONE_MONTH:
        secret(
          "STRIPE_PRICE_ONE_MONTH",
        ),

      STRIPE_EXPECTED_LIVEMODE: expectedLivemode,

      APP_BASE_URL:
        appBaseUrl,

      /*
       * Declares the variable for Amplify's generated env typings.
       *
       * backend.ts replaces this placeholder with the real
       * DynamoDB table name during backend composition.
       */
      CHECKOUT_ATTEMPT_TABLE_NAME:
        "WILL_BE_SET_BY_BACKEND",
    },
  });