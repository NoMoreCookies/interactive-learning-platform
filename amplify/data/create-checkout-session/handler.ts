import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

import type {
  AppSyncResolverHandler,
} from "aws-lambda";

import Stripe from "stripe";

import {
  env,
} from "$amplify/env/create-checkout-session";

import {
  buildLegalAcceptanceId,
} from "../../../lib/legal-acceptance-id";

import {
  BILLING_CONTRACT_VERSION,
  BILLING_PLANS,
  isBillingPlanCode,
  type BillingPlanCode,
} from "../../shared/billing-plans";

import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
} from "../../shared/legal-versions";

type CreateCheckoutSessionArguments = {
  planCode: string;
};

type CreateCheckoutSessionResult =
  | {
      status: "READY";
      url: string;
      retryAfterSeconds: null;
    }
  | {
      status: "RATE_LIMITED";
      url: null;
      retryAfterSeconds: number;
    };

class CheckoutClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutClientError";
  }
}

const dynamoDb =
  new DynamoDBClient({});

const stripe =
  new Stripe(
    env.STRIPE_SECRET_KEY,
  );

/*
 * A legitimate user should never need to create multiple Stripe
 * Checkout Sessions within such a short time window.
 */
const CHECKOUT_COOLDOWN_SECONDS =
  20;

/*
 * Rate-limit records are temporary operational data.
 *
 * TTL is only responsible for eventual cleanup. Security does not
 * depend on DynamoDB deleting the record at an exact time.
 */
const RATE_LIMIT_TTL_SECONDS =
  60 * 60;

function getAuthenticatedUserId(
  identity: unknown,
): string {
  if (
    !identity ||
    typeof identity !== "object" ||
    !("sub" in identity)
  ) {
    throw new CheckoutClientError(
      "Musisz być zalogowany, aby rozpocząć płatność.",
    );
  }

  const sub =
    (
      identity as {
        sub?: unknown;
      }
    ).sub;

  if (
    typeof sub !==
      "string" ||
    !sub.trim()
  ) {
    throw new CheckoutClientError(
      "Nie udało się ustalić tożsamości użytkownika.",
    );
  }

  return sub.trim();
}

function getStripePriceId(
  planCode: BillingPlanCode,
): string {
  switch (planCode) {
    case "ONE_MONTH":
      return env
        .STRIPE_PRICE_ONE_MONTH
        .trim();
  }
}

function getAppBaseUrl(): string {
  const configuredUrl =
    env.APP_BASE_URL.trim();

  let url: URL;

  try {
    url =
      new URL(
        configuredUrl,
      );
  } catch {
    throw new Error(
      "Invalid APP_BASE_URL configuration.",
    );
  }

  const isLocalDevelopment =
    url.protocol ===
      "http:" &&
    (
      url.hostname ===
        "localhost" ||
      url.hostname ===
        "127.0.0.1"
    );

  if (
    url.protocol !==
      "https:" &&
    !isLocalDevelopment
  ) {
    throw new Error(
      "APP_BASE_URL must use HTTPS outside local development.",
    );
  }

  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !==
      "/"
  ) {
    throw new Error(
      "APP_BASE_URL must contain only the application origin.",
    );
  }

  return url.origin;
}

async function assertCurrentLegalAcceptance(
  userId: string,
): Promise<void> {
  const acceptanceId =
    buildLegalAcceptanceId(
      userId,
      CURRENT_TERMS_VERSION,
      CURRENT_PRIVACY_VERSION,
    );

  const response =
    await dynamoDb.send(
      new GetItemCommand({
        TableName:
          env
            .LEGAL_ACCEPTANCE_TABLE_NAME,

        Key: {
          id: {
            S: acceptanceId,
          },
        },

        ProjectionExpression:
          "id",

        /*
         * Checkout is security-sensitive.
         *
         * Strong consistency ensures that a legal acceptance that
         * has just been written is immediately visible here.
         */
        ConsistentRead:
          true,
      }),
    );

  if (!response.Item) {
    throw new CheckoutClientError(
      "Musisz zaakceptować aktualny regulamin i politykę prywatności przed zakupem.",
    );
  }
}

async function getStoredStripeCustomerId(
  userId: string,
): Promise<string | null> {
  const response =
    await dynamoDb.send(
      new GetItemCommand({
        TableName:
          env
            .BILLING_CUSTOMER_TABLE_NAME,

        Key: {
          userId: {
            S: userId,
          },
        },

        ProjectionExpression:
          "stripeCustomerId",

        ConsistentRead:
          true,
      }),
    );

  if (!response.Item) {
    return null;
  }

  const stripeCustomerId =
    response.Item
      .stripeCustomerId
      ?.S
      ?.trim();

  if (
    !stripeCustomerId ||
    !stripeCustomerId.startsWith(
      "cus_",
    )
  ) {
    throw new Error(
      "Invalid BillingCustomer record.",
    );
  }

  return stripeCustomerId;
}

function isConditionalCheckFailure(
  error: unknown,
): boolean {
  return (
    typeof error ===
      "object" &&
    error !== null &&
    "name" in error &&
    (
      error as {
        name?: unknown;
      }
    ).name ===
      "ConditionalCheckFailedException"
  );
}

/*
 * Atomically consumes one Checkout attempt for the authenticated
 * user.
 *
 * Return value:
 *
 * null:
 *   Checkout may continue.
 *
 * number:
 *   Remaining cooldown in seconds.
 *
 * The condition and the write are performed atomically by DynamoDB,
 * preventing concurrent requests from both passing the limiter.
 */
async function consumeCheckoutRateLimit(
  userId: string,
): Promise<number | null> {
  const now =
    Math.floor(
      Date.now() / 1000,
    );

  const nextAllowedAt =
    now +
    CHECKOUT_COOLDOWN_SECONDS;

  const expiresAt =
    now +
    RATE_LIMIT_TTL_SECONDS;

  try {
    await dynamoDb.send(
      new UpdateItemCommand({
        TableName:
          env
            .CHECKOUT_RATE_LIMIT_TABLE_NAME,

        Key: {
          userId: {
            S: userId,
          },
        },

        /*
         * Allow the request only when:
         *
         * - no limiter exists yet, or
         * - the previous cooldown has expired.
         */
        ConditionExpression:
          "attribute_not_exists(nextAllowedAt) OR nextAllowedAt <= :now",

        UpdateExpression:
          "SET nextAllowedAt = :nextAllowedAt, expiresAt = :expiresAt",

        ExpressionAttributeValues: {
          ":now": {
            N: String(
              now,
            ),
          },

          ":nextAllowedAt": {
            N: String(
              nextAllowedAt,
            ),
          },

          ":expiresAt": {
            N: String(
              expiresAt,
            ),
          },
        },

        /*
         * When the conditional write fails, DynamoDB returns the
         * previous limiter record as part of the exception.
         *
         * This lets us calculate retryAfterSeconds without issuing
         * another GetItem request.
         */
        ReturnValuesOnConditionCheckFailure:
          "ALL_OLD",
      }),
    );

    return null;
  } catch (error) {
    if (
      !isConditionalCheckFailure(
        error,
      )
    ) {
      throw error;
    }

    const failedItem =
      (
        error as {
          Item?: {
            nextAllowedAt?: {
              N?: string;
            };
          };
        }
      ).Item;

    const rawNextAllowedAt =
      failedItem
        ?.nextAllowedAt
        ?.N;

    const storedNextAllowedAt =
      typeof rawNextAllowedAt ===
        "string"
        ? Number(
            rawNextAllowedAt,
          )
        : Number.NaN;

    /*
     * If DynamoDB unexpectedly does not return a valid timestamp,
     * fail conservatively from the UX perspective.
     *
     * Backend security still remains enforced by the conditional
     * write itself.
     */
    if (
      !Number.isFinite(
        storedNextAllowedAt,
      )
    ) {
      return CHECKOUT_COOLDOWN_SECONDS;
    }

    return Math.max(
      1,
      Math.ceil(
        storedNextAllowedAt -
          now,
      ),
    );
  }
}

async function getOrCreateStripeCustomer(
  userId: string,
): Promise<string> {
  const existingCustomerId =
    await getStoredStripeCustomerId(
      userId,
    );

  if (existingCustomerId) {
    return existingCustomerId;
  }

  /*
   * We deliberately do not copy the Cognito email here.
   *
   * Stripe Checkout may collect billing email itself.
   *
   * The stable application relationship is:
   *
   * Cognito sub -> Stripe Customer
   *
   * and not:
   *
   * email -> Stripe Customer
   */
  const stripeCustomer =
    await stripe.customers.create(
      {
        metadata: {
          appUserId:
            userId,
        },
      },
      {
        /*
         * Protect retries from creating multiple Stripe Customers
         * for the same application user.
         */
        idempotencyKey:
          `poprostumatma:customer:${userId}`,
      },
    );

  const timestamp =
    new Date()
      .toISOString();

  try {
    await dynamoDb.send(
      new PutItemCommand({
        TableName:
          env
            .BILLING_CUSTOMER_TABLE_NAME,

        Item: {
          userId: {
            S: userId,
          },

          stripeCustomerId: {
            S:
              stripeCustomer.id,
          },

          createdAt: {
            S: timestamp,
          },

          updatedAt: {
            S: timestamp,
          },
        },

        /*
         * Prevent concurrent requests from overwriting an existing
         * Cognito user -> Stripe Customer mapping.
         */
        ConditionExpression:
          "attribute_not_exists(userId)",
      }),
    );

    return stripeCustomer.id;
  } catch (error) {
    if (
      !isConditionalCheckFailure(
        error,
      )
    ) {
      throw error;
    }

    /*
     * Another invocation created the authoritative mapping first.
     * Read and use that mapping rather than overwriting it.
     */
    const concurrentCustomerId =
      await getStoredStripeCustomerId(
        userId,
      );

    if (!concurrentCustomerId) {
      throw new Error(
        "Billing customer race could not be reconciled.",
      );
    }

    return concurrentCustomerId;
  }
}

async function assertStripePriceMatchesPlan(
  planCode: BillingPlanCode,
  stripePriceId: string,
): Promise<void> {
  const expectedPlan =
    BILLING_PLANS[
      planCode
    ];

  const stripePrice =
    await stripe.prices.retrieve(
      stripePriceId,
    );

  const isValid =
    stripePrice.active ===
      true &&
    stripePrice.type ===
      "one_time" &&
    stripePrice.currency ===
      expectedPlan.currency &&
    stripePrice.unit_amount ===
      expectedPlan.unitAmount;

  if (!isValid) {
    throw new Error(
      "Stripe Price does not match the trusted billing plan.",
    );
  }
}

function getSafeErrorDetails(
  error: unknown,
): Record<string, string> {
  if (
    typeof error !==
      "object" ||
    error === null
  ) {
    return {
      name:
        "UnknownError",
    };
  }

  const candidate =
    error as {
      name?: unknown;
      type?: unknown;
      code?: unknown;
    };

  const details:
    Record<string, string> =
      {};

  if (
    typeof candidate.name ===
    "string"
  ) {
    details.name =
      candidate.name;
  }

  if (
    typeof candidate.type ===
    "string"
  ) {
    details.type =
      candidate.type;
  }

  if (
    typeof candidate.code ===
    "string"
  ) {
    details.code =
      candidate.code;
  }

  return details;
}

export const handler:
  AppSyncResolverHandler<
    CreateCheckoutSessionArguments,
    CreateCheckoutSessionResult
  > =
  async (event) => {
    try {
      const rawPlanCode =
        event.arguments
          ?.planCode;

      if (
        typeof rawPlanCode !==
          "string" ||
        !isBillingPlanCode(
          rawPlanCode,
        )
      ) {
        throw new CheckoutClientError(
          "Nieprawidłowy plan płatności.",
        );
      }

      const planCode =
        rawPlanCode;

      /*
       * User identity is resolved exclusively from the authenticated
       * Cognito identity supplied by AppSync.
       *
       * The caller cannot choose another user's ID.
       */
      const userId =
        getAuthenticatedUserId(
          event.identity,
        );

      /*
       * Stop repeated Checkout requests before performing the more
       * expensive billing and Stripe operations.
       */
      const retryAfterSeconds =
        await consumeCheckoutRateLimit(
          userId,
        );

      if (
        retryAfterSeconds !==
          null
      ) {
        return {
          status:
            "RATE_LIMITED",

          url:
            null,

          retryAfterSeconds,
        };
      }

      /*
       * Billing is blocked when the authenticated user has not
       * accepted the current legal document versions.
       */
      await assertCurrentLegalAcceptance(
        userId,
      );

      const stripePriceId =
        getStripePriceId(
          planCode,
        );

      if (!stripePriceId) {
        throw new Error(
          "Missing Stripe Price configuration.",
        );
      }

      /*
       * Fail closed when Stripe Dashboard configuration does not
       * match the trusted server-side billing plan definition.
       */
      await assertStripePriceMatchesPlan(
        planCode,
        stripePriceId,
      );

      const stripeCustomerId =
        await getOrCreateStripeCustomer(
          userId,
        );

      const appBaseUrl =
        getAppBaseUrl();

      const metadata = {
        appUserId:
          userId,

        planCode,

        billingContractVersion:
          BILLING_CONTRACT_VERSION,

        stripePriceId,

        termsVersion:
          CURRENT_TERMS_VERSION,

        privacyVersion:
          CURRENT_PRIVACY_VERSION,
      };

      const session =
        await stripe
          .checkout
          .sessions
          .create({
            mode:
              BILLING_PLANS[
                planCode
              ].checkoutMode,

            customer:
              stripeCustomerId,

            client_reference_id:
              userId,

            line_items: [
              {
                price:
                  stripePriceId,

                quantity:
                  1,
              },
            ],

            success_url:
              `${appBaseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,

            cancel_url:
              `${appBaseUrl}/checkout/cancel`,

            locale:
              "pl",

            metadata,

            payment_intent_data: {
              metadata,
            },
          });

      if (!session.url) {
        throw new Error(
          "Stripe Checkout Session did not return a URL.",
        );
      }

      /*
       * Return only data required by the browser.
       *
       * Internal Stripe identifiers, billing state and secrets
       * remain server-side.
       */
      return {
        status:
          "READY",

        url:
          session.url,

        retryAfterSeconds:
          null,
      };
    } catch (error) {
      /*
       * Expected client/business errors may safely be returned
       * through AppSync without exposing infrastructure details.
       */
      if (
        error instanceof
        CheckoutClientError
      ) {
        throw error;
      }

      /*
       * Never log:
       *
       * - Stripe secret keys,
       * - Checkout URLs,
       * - JWTs,
       * - full Stripe error objects,
       * - payment metadata.
       */
      console.error(
        "Failed to create Stripe Checkout Session.",
        getSafeErrorDetails(
          error,
        ),
      );

      throw new Error(
        "Nie udało się utworzyć sesji płatności.",
      );
    }
  };