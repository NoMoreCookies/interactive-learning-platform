import { boundedAwsOptions, budgetedClient, resolverBudget, withResolverBudget } from "../../shared/resolver-budget";
import { recoverOrCreateCheckout } from "../../shared/checkout-session";
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
  CHECKOUT_CONSENT_VERSION,
} from "../../shared/checkout-consent";

import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
} from "../../shared/legal-versions";

type CreateCheckoutSessionArguments = {
  purchaseIntentId: string;
  planCode: string;

  immediateDeliveryConsent:
    boolean;

  withdrawalRightLossAcknowledged:
    boolean;
};

type CreateCheckoutSessionResult =
  | { status: "COMPLETED"; sessionId: string }
  | { status: "EXPIRED" }
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
    this.name =
      "CheckoutClientError";
  }
}

const dynamoDb =
  budgetedClient(new DynamoDBClient(boundedAwsOptions));

const stripe =
  new Stripe(
    env.STRIPE_SECRET_KEY,
    { timeout: 2_500, maxNetworkRetries: 0 },
  );

/*
 * CHECKOUT_ATTEMPT_TABLE_NAME is injected dynamically from backend.ts
 * with backend.createCheckoutSession.addEnvironment(...).
 *
 * Amplify's generated $amplify/env typings do not include this
 * cross-resource variable in the current toolchain, so we read this one
 * value directly from process.env and validate it explicitly.
 *
 * Missing configuration fails closed during Lambda initialization.
 */
function requireRuntimeEnvironmentVariable(
  name: string,
): string {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required runtime environment variable: ${name}.`,
    );
  }

  return value;
}

const checkoutAttemptTableName =
  requireRuntimeEnvironmentVariable(
    "CHECKOUT_ATTEMPT_TABLE_NAME",
  );

/*
 * A legitimate user should not need to create multiple Stripe
 * Checkout Sessions within such a short period.
 *
 * This primarily protects expensive downstream operations.
 * It is not a complete pre-Lambda DoS protection mechanism.
 */
const CHECKOUT_COOLDOWN_SECONDS =
  20;

/*
 * DynamoDB TTL is used only for eventual cleanup of rate-limit
 * records.
 *
 * Security never depends on DynamoDB removing the item at a precise
 * time.
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
    typeof sub !== "string" ||
    !sub.trim()
  ) {
    throw new CheckoutClientError(
      "Nie udało się ustalić tożsamości użytkownika.",
    );
  }

  return sub.trim();
}

function assertCheckoutConsents(
  immediateDeliveryConsent:
    unknown,
  withdrawalRightLossAcknowledged:
    unknown,
): void {
  /*
   * Both declarations must be explicitly true.
   *
   * Truthy values such as:
   *
   * "true"
   * 1
   * {}
   *
   * are deliberately rejected.
   */
  if (
    immediateDeliveryConsent !==
      true ||
    withdrawalRightLossAcknowledged !==
      true
  ) {
    throw new CheckoutClientError(
      "Aby uzyskać natychmiastowy dostęp, musisz potwierdzić wymagane oświadczenia dotyczące dostarczania treści cyfrowych.",
    );
  }
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
    url.protocol === "http:" &&
    (
      url.hostname ===
        "localhost" ||
      url.hostname ===
        "127.0.0.1"
    );

  if (
    url.protocol !== "https:" &&
    !isLocalDevelopment
  ) {
    throw new Error(
      "APP_BASE_URL must use HTTPS outside local development.",
    );
  }

  /*
   * Only an application origin is allowed.
   *
   * Examples accepted:
   *
   * https://poprostumatma.pl
   * http://localhost:3000
   *
   * Examples rejected:
   *
   * https://example.com/path
   * https://example.com?x=1
   * https://user:pass@example.com
   */
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
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
         * Strong consistency avoids rejecting a valid purchase
         * immediately after the current legal acceptance was stored.
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
 * null:
 *   Checkout may continue.
 *
 * number:
 *   Remaining cooldown in seconds.
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
   * Cognito sub is the stable application identity.
   *
   * Email is deliberately not used as the billing identity.
   */
  resolverBudget().require(5_000);
  const stripeCustomer =
    await stripe.customers.create(
      {
        metadata: {
          appUserId:
            userId,
        },
      },
      {
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
          checkoutRecoveryReady: { BOOL: true },

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
     * Another concurrent invocation created the authoritative
     * mapping first.
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

function getExpectedLivemode(): boolean {
  const value = process.env.STRIPE_EXPECTED_LIVEMODE;

  if (value !== "true" && value !== "false") {
    throw new Error(
      "Invalid Stripe environment configuration.",
    );
  }

  return value === "true";
}

async function assertStripePriceMatchesPlan(
  planCode: BillingPlanCode,
  stripePriceId: string,
): Promise<void> {
  const expectedPlan = BILLING_PLANS[planCode];
  const expectedLivemode = getExpectedLivemode();

  resolverBudget().require(4_000);
  const stripePrice = await stripe.prices.retrieve(
    stripePriceId,
  );

  const isValid =
    stripePrice.livemode === expectedLivemode &&
    stripePrice.active === true &&
    stripePrice.type === "one_time" &&
    stripePrice.currency === expectedPlan.currency &&
    stripePrice.unit_amount === expectedPlan.unitAmount;

  if (!isValid) {
    throw new Error(
      "Stripe Price does not match the trusted billing plan or environment.",
    );
  }
}




function getSafeErrorDetails(
  error: unknown,
): Record<string, string> {
  if (
    typeof error !== "object" ||
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
  async (event) => withResolverBudget(24_000, async () => {
    try {
      const rawPlanCode =
        event.arguments
          ?.planCode;

      if (
        !isBillingPlanCode(
          rawPlanCode,
        )
      ) {
        throw new CheckoutClientError(
          "Nieprawidłowy plan płatności.",
        );
      }

      const planCode = rawPlanCode;
      const purchaseIntentId = event.arguments.purchaseIntentId;
      if (typeof purchaseIntentId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(purchaseIntentId)) {
        throw new CheckoutClientError("Nieprawidłowy identyfikator próby zakupu.");
      }

      /*
       * Checkout-specific declarations are validated before the
       * rate-limit record is consumed, so a normal user does not
       * receive a cooldown merely for forgetting a required checkbox.
       */
      assertCheckoutConsents(
        event.arguments
          ?.immediateDeliveryConsent,

        event.arguments
          ?.withdrawalRightLossAcknowledged,
      );

      /*
       * The application user is derived solely from the trusted
       * AppSync/Cognito identity.
       */
      const userId =
        getAuthenticatedUserId(
          event.identity,
        );

      /*
       * Prevent repeated expensive checkout operations.
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
       * Checkout is blocked unless the authenticated user has
       * accepted the current Terms and Privacy Policy versions.
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
       * Protect against a wrong Stripe Dashboard / secret
       * configuration.
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

      const plan = BILLING_PLANS[planCode];
      const recovered = await recoverOrCreateCheckout({
        db: dynamoDb, stripe, attemptsTable: checkoutAttemptTableName,
        customersTable: env.BILLING_CUSTOMER_TABLE_NAME, budget: resolverBudget(),
      }, {
        purchaseIntentId, userId, stripeCustomerId, planCode, stripePriceId, appBaseUrl,
        livemode: getExpectedLivemode(), amountTotal: plan.unitAmount,
        currency: plan.currency, accessDays: plan.accessDays,
        billingContractVersion: BILLING_CONTRACT_VERSION,
        termsVersion: CURRENT_TERMS_VERSION, privacyVersion: CURRENT_PRIVACY_VERSION,
        checkoutConsentVersion: CHECKOUT_CONSENT_VERSION,
      });
      return recovered.status === "READY" ? { ...recovered, retryAfterSeconds: null } : recovered;

    } catch (error) {
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
       * - payment metadata,
       * - full Stripe error objects.
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
  });
