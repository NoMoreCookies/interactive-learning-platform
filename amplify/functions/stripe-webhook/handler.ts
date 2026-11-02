import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  TransactWriteItemsCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";

import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
} from "aws-lambda";

import Stripe from "stripe";
import { purchaseHistory, type PurchaseHistory } from "../../shared/purchase-history";
import { preflightRefundHistory, applyRefundObservation, RefundCorrelationIncident, MissingRefundCorrelation, recordExternalRefundReview } from "../../shared/refund-reconciliation";

import {
  env,
} from "$amplify/env/stripe-webhook";

const dynamoDb =
  new DynamoDBClient({});

const REFUND_EVENT_TYPES = new Set(["refund.created", "refund.updated", "refund.failed"]);

const ALLOWED_EVENT_TYPES =
  new Set([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
  ]);

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

const MAX_ENTITLEMENT_RETRIES =
  3;

class WebhookContractError extends Error {
  constructor(
    public readonly code: string,
  ) {
    super(code);
    this.name =
      "WebhookContractError";
  }
}

type CheckoutAttemptSnapshot = {
  checkoutAttemptId: string;
  userId: string;
  stripeCustomerId: string;
  planCode: string;
  billingContractVersion: string;
  stripePriceId: string;
  amountTotal: number;
  currency: string;
  checkoutMode: "payment";
  accessDays: number;
  termsVersion: string;
  privacyVersion: string;
  checkoutConsentVersion: string;
  immediateDeliveryConsent: true;
  withdrawalRightLossAcknowledged: true;
  consentedAt: string;
  status: "CREATED" | "PAID";
};

type VerifiedCheckout = {
  session: Stripe.Checkout.Session;
  attempt: CheckoutAttemptSnapshot;
};

type EntitlementSnapshot =
  | {
      exists: false;
    }
  | {
      exists: true;
      accessUntil: string;
      revokedAt: string | null;
      version: number;
      history: PurchaseHistory;
    };

function requireRuntimeEnvironmentVariable(
  name: string,
): string {
  const value =
    process.env[name]
      ?.trim();

  if (!value) {
    throw new Error(
      `Missing required runtime environment variable: ${name}.`,
    );
  }

  return value;
}

/*
 * Table names are injected by backend.ts after the Amplify function
 * definition is created. Reading them from process.env avoids coupling
 * runtime code to stale generated $amplify/env typings.
 */
const billingCustomerTableName =
  requireRuntimeEnvironmentVariable(
    "BILLING_CUSTOMER_TABLE_NAME",
  );

const stripeEventTableName =
  requireRuntimeEnvironmentVariable(
    "STRIPE_EVENT_TABLE_NAME",
  );

const billingPurchaseTableName =
  requireRuntimeEnvironmentVariable(
    "BILLING_PURCHASE_TABLE_NAME",
  );

const entitlementTableName =
  requireRuntimeEnvironmentVariable(
    "ENTITLEMENT_TABLE_NAME",
  );

const checkoutAttemptTableName =
  requireRuntimeEnvironmentVariable(
    "CHECKOUT_ATTEMPT_TABLE_NAME",
  );

function jsonResponse(
  statusCode: number,
  body: Record<string, unknown>,
) {
  return {
    statusCode,

    headers: {
      "content-type":
        "application/json",
    },

    body:
      JSON.stringify(body),
  };
}

function getRawBody(
  event: APIGatewayProxyEventV2,
): string | Buffer {
  if (
    typeof event.body !== "string"
  ) {
    throw new Error(
      "Missing webhook body.",
    );
  }

  if (event.isBase64Encoded) {
    return Buffer.from(
      event.body,
      "base64",
    );
  }

  return event.body;
}

function getStripeSignature(
  event: APIGatewayProxyEventV2,
): string | null {
  return (
    event.headers[
      "stripe-signature"
    ] ??
    event.headers[
      "Stripe-Signature"
    ] ??
    null
  );
}

function getExpectedLivemode():
  boolean {
  const value =
    env
      .STRIPE_EXPECTED_LIVEMODE;

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(
    "Invalid STRIPE_EXPECTED_LIVEMODE configuration.",
  );
}

function requireMetadata(
  session: Stripe.Checkout.Session,
  key: string,
): string {
  const value =
    session.metadata?.[
      key
    ]?.trim();

  if (!value) {
    throw new WebhookContractError(
      `missing_metadata_${key}`,
    );
  }

  return value;
}

function getStripeCustomerId(
  session:
    Stripe.Checkout.Session,
): string {
  const customer =
    session.customer;

  if (
    typeof customer ===
    "string"
  ) {
    return customer;
  }

  if (
    customer &&
    typeof customer.id ===
      "string"
  ) {
    return customer.id;
  }

  throw new WebhookContractError(
    "missing_customer",
  );
}

function getPaymentIntentId(
  session:
    Stripe.Checkout.Session,
): string {
  const paymentIntent =
    session.payment_intent;

  /*
   * Stripe may return only the PaymentIntent ID.
   */
  if (
    typeof paymentIntent ===
    "string"
  ) {
    if (
      paymentIntent.startsWith(
        "pi_",
      )
    ) {
      return paymentIntent;
    }

    throw new WebhookContractError(
      "invalid_payment_intent",
    );
  }

  /*
   * Or Stripe may return an expanded PaymentIntent object.
   *
   * At this point TypeScript already knows that paymentIntent
   * cannot be a string.
   */
  if (
    paymentIntent &&
    typeof paymentIntent.id ===
      "string" &&
    paymentIntent.id.startsWith(
      "pi_",
    )
  ) {
    return paymentIntent.id;
  }

  /*
   * A successfully paid one-time Checkout must have a usable
   * PaymentIntent because refunds are later anchored to it.
   */
  throw new WebhookContractError(
    "missing_payment_intent",
  );
}

function isCanonicalIsoTimestamp(
  value: string,
): boolean {
  const timestamp =
    Date.parse(value);

  if (
    !Number.isFinite(
      timestamp,
    )
  ) {
    return false;
  }

  return (
    new Date(timestamp)
      .toISOString() === value
  );
}

function getRequiredStringAttribute(
  item: Record<string, AttributeValue>,
  fieldName: string,
): string {
  const value =
    item[fieldName];

  if (
    !value ||
    !("S" in value) ||
    typeof value.S !== "string" ||
    !value.S.trim()
  ) {
    throw new Error(
      `Invalid CheckoutAttempt.${fieldName}.`,
    );
  }

  return value.S.trim();
}

function getRequiredPositiveIntegerAttribute(
  item: Record<string, AttributeValue>,
  fieldName: string,
): number {
  const value =
    item[fieldName];

  if (
    !value ||
    !("N" in value) ||
    typeof value.N !== "string"
  ) {
    throw new Error(
      `Invalid CheckoutAttempt.${fieldName}.`,
    );
  }

  const parsed =
    Number(value.N);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed <= 0
  ) {
    throw new Error(
      `Invalid CheckoutAttempt.${fieldName}.`,
    );
  }

  return parsed;
}

function getRequiredTrueBooleanAttribute(
  item: Record<string, AttributeValue>,
  fieldName: string,
): true {
  const value =
    item[fieldName];

  if (
    !value ||
    !("BOOL" in value) ||
    value.BOOL !== true
  ) {
    throw new Error(
      `Invalid CheckoutAttempt.${fieldName}.`,
    );
  }

  return true;
}

async function getCheckoutAttempt(
  checkoutAttemptId: string,
): Promise<CheckoutAttemptSnapshot> {
  const response =
    await dynamoDb.send(
      new GetItemCommand({
        TableName:
          checkoutAttemptTableName,

        Key: {
          checkoutAttemptId: {
            S:
              checkoutAttemptId,
          },
        },

        ConsistentRead:
          true,
      }),
    );

  const item =
    response.Item;

  if (!item) {
    throw new WebhookContractError(
      "checkout_attempt_not_found",
    );
  }

  const storedAttemptId =
    getRequiredStringAttribute(
      item,
      "checkoutAttemptId",
    );

  if (
    storedAttemptId !==
      checkoutAttemptId
  ) {
    throw new Error(
      "CheckoutAttempt primary key mismatch.",
    );
  }

  const checkoutMode =
    getRequiredStringAttribute(
      item,
      "checkoutMode",
    );

  if (
    checkoutMode !== "payment"
  ) {
    throw new Error(
      "Invalid CheckoutAttempt.checkoutMode.",
    );
  }

  const currency =
    getRequiredStringAttribute(
      item,
      "currency",
    );

  if (
    !/^[a-z]{3}$/.test(
      currency,
    )
  ) {
    throw new Error(
      "Invalid CheckoutAttempt.currency.",
    );
  }

  const consentedAt =
    getRequiredStringAttribute(
      item,
      "consentedAt",
    );

  if (
    !isCanonicalIsoTimestamp(
      consentedAt,
    )
  ) {
    throw new Error(
      "Invalid CheckoutAttempt.consentedAt.",
    );
  }

  const rawStatus =
    getRequiredStringAttribute(
      item,
      "status",
    );

  if (
    rawStatus !== "CREATED" &&
    rawStatus !== "PAID"
  ) {
    throw new Error(
      "Invalid CheckoutAttempt.status.",
    );
  }

  return {
    checkoutAttemptId:
      storedAttemptId,

    userId:
      getRequiredStringAttribute(
        item,
        "userId",
      ),

    stripeCustomerId:
      getRequiredStringAttribute(
        item,
        "stripeCustomerId",
      ),

    planCode:
      getRequiredStringAttribute(
        item,
        "planCode",
      ),

    billingContractVersion:
      getRequiredStringAttribute(
        item,
        "billingContractVersion",
      ),

    stripePriceId:
      getRequiredStringAttribute(
        item,
        "stripePriceId",
      ),

    amountTotal:
      getRequiredPositiveIntegerAttribute(
        item,
        "amountTotal",
      ),

    currency,

    checkoutMode,

    accessDays:
      getRequiredPositiveIntegerAttribute(
        item,
        "accessDays",
      ),

    termsVersion:
      getRequiredStringAttribute(
        item,
        "termsVersion",
      ),

    privacyVersion:
      getRequiredStringAttribute(
        item,
        "privacyVersion",
      ),

    checkoutConsentVersion:
      getRequiredStringAttribute(
        item,
        "checkoutConsentVersion",
      ),

    immediateDeliveryConsent:
      getRequiredTrueBooleanAttribute(
        item,
        "immediateDeliveryConsent",
      ),

    withdrawalRightLossAcknowledged:
      getRequiredTrueBooleanAttribute(
        item,
        "withdrawalRightLossAcknowledged",
      ),

    consentedAt,

    status:
      rawStatus,
  };
}

async function getStoredCustomerId(
  userId: string,
): Promise<string | null> {
  const response =
    await dynamoDb.send(
      new GetItemCommand({
        TableName:
          billingCustomerTableName,

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

  return (
    response.Item
      ?.stripeCustomerId
      ?.S
      ?.trim() ??
    null
  );
}

/*
 * The CheckoutAttempt is the historical source of truth for the contract
 * used to create this session. No comparison is made against the CURRENT
 * BILLING_PLANS or CURRENT billing contract version, so an in-flight valid
 * checkout remains fulfillable after a future price/configuration deploy.
 */
async function verifyCheckoutContract(
  stripeEvent: Stripe.Event,
): Promise<VerifiedCheckout> {
  const session =
    stripeEvent.data.object as
      Stripe.Checkout.Session;

  const expectedLivemode =
    getExpectedLivemode();

  if (
    stripeEvent.livemode !==
      expectedLivemode ||
    session.livemode !==
      expectedLivemode
  ) {
    throw new WebhookContractError(
      "wrong_livemode",
    );
  }

  if (
    typeof session.id !== "string" ||
    !session.id.startsWith(
      "cs_",
    )
  ) {
    throw new WebhookContractError(
      "invalid_checkout_session_id",
    );
  }

  if (
    session.status !==
      "complete"
  ) {
    throw new WebhookContractError(
      "checkout_not_complete",
    );
  }

  const checkoutAttemptId =
    requireMetadata(
      session,
      "checkoutAttemptId",
    );

  const attempt =
    await getCheckoutAttempt(
      checkoutAttemptId,
    );

  if (
    session.mode !==
      attempt.checkoutMode
  ) {
    throw new WebhookContractError(
      "wrong_checkout_mode",
    );
  }

  if (
    session.currency !==
      attempt.currency ||
    session.amount_total !==
      attempt.amountTotal
  ) {
    throw new WebhookContractError(
      "wrong_amount_or_currency",
    );
  }

  const metadataChecks:
    Array<[
      string,
      string,
    ]> = [
      [
        "appUserId",
        attempt.userId,
      ],
      [
        "planCode",
        attempt.planCode,
      ],
      [
        "billingContractVersion",
        attempt.billingContractVersion,
      ],
      [
        "stripePriceId",
        attempt.stripePriceId,
      ],
      [
        "termsVersion",
        attempt.termsVersion,
      ],
      [
        "privacyVersion",
        attempt.privacyVersion,
      ],
      [
        "checkoutConsentVersion",
        attempt.checkoutConsentVersion,
      ],
    ];

  for (
    const [
      key,
      expectedValue,
    ] of metadataChecks
  ) {
    if (
      requireMetadata(
        session,
        key,
      ) !== expectedValue
    ) {
      throw new WebhookContractError(
        `metadata_mismatch_${key}`,
      );
    }
  }

  if (
    session
      .client_reference_id !==
    attempt.userId
  ) {
    throw new WebhookContractError(
      "user_reference_mismatch",
    );
  }

  const stripeCustomerId =
    getStripeCustomerId(
      session,
    );

  if (
    stripeCustomerId !==
      attempt.stripeCustomerId
  ) {
    throw new WebhookContractError(
      "checkout_attempt_customer_mismatch",
    );
  }

  const storedCustomerId =
    await getStoredCustomerId(
      attempt.userId,
    );

  if (
    !storedCustomerId ||
    storedCustomerId !==
      stripeCustomerId
  ) {
    throw new WebhookContractError(
      "customer_mapping_mismatch",
    );
  }

  return {
    session,
    attempt,
  };
}

function isConditionalFailure(
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

function isTransactionCanceled(
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
      "TransactionCanceledException"
  );
}

async function recordEventOnly(
  stripeEvent: Stripe.Event,
  checkoutAttemptId: string,
  sessionId: string,
  outcome: string,
): Promise<void> {
  try {
    await dynamoDb.send(
      new PutItemCommand({
        TableName:
          stripeEventTableName,

        Item: {
          eventId: {
            S: stripeEvent.id,
          },

          eventType: {
            S: stripeEvent.type,
          },

          stripeCreatedAt: {
            N: String(
              stripeEvent.created,
            ),
          },

          processedAt: {
            S:
              new Date()
                .toISOString(),
          },

          checkoutAttemptId: {
            S:
              checkoutAttemptId,
          },

          checkoutSessionId: {
            S: sessionId,
          },

          outcome: {
            S: outcome,
          },
        },

        ConditionExpression:
          "attribute_not_exists(eventId)",
      }),
    );
  } catch (error) {
    if (
      isConditionalFailure(
        error,
      )
    ) {
      return;
    }

    throw error;
  }
}

async function getEntitlement(
  userId: string,
): Promise<EntitlementSnapshot> {
  const response =
    await dynamoDb.send(
      new GetItemCommand({
        TableName:
          entitlementTableName,

        Key: {
          userId: {
            S: userId,
          },
        },

        ProjectionExpression:
          "accessUntil, revokedAt, #version, purchaseHistoryHead, purchaseHistoryCount, purchaseHistoryState",

        ExpressionAttributeNames: {
          "#version":
            "version",
        },

        ConsistentRead:
          true,
      }),
    );

  if (!response.Item) {
    return {
      exists: false,
    };
  }

  const accessUntil =
    response.Item
      .accessUntil
      ?.S;

  const versionText =
    response.Item
      .version
      ?.N;

  if (
    !accessUntil ||
    !versionText ||
    !isCanonicalIsoTimestamp(
      accessUntil,
    )
  ) {
    throw new Error(
      "Invalid entitlement record.",
    );
  }

  const version =
    Number(
      versionText,
    );

  if (
    !Number.isSafeInteger(
      version,
    ) ||
    version < 1
  ) {
    throw new Error(
      "Invalid entitlement record.",
    );
  }

  return {
    exists: true,
    accessUntil,
    revokedAt:
      response.Item
        .revokedAt
        ?.S ??
      null,
    version,
    history: purchaseHistory(response.Item),
  };
}

function calculateGrantPeriod(
  entitlement:
    EntitlementSnapshot,
  accessDays: number,
  paidAt:
    Date,
) {
  const paidAtMs =
    paidAt.getTime();

  if (
    !Number.isFinite(
      paidAtMs,
    )
  ) {
    throw new Error(
      "Invalid payment timestamp.",
    );
  }

  let baseMs =
    paidAtMs;

  if (
    entitlement.exists &&
    !entitlement.revokedAt
  ) {
    const currentUntilMs =
      Date.parse(
        entitlement
          .accessUntil,
      );

    if (
      currentUntilMs >
      paidAtMs
    ) {
      baseMs =
        currentUntilMs;
    }
  }

  const untilMs =
    baseMs +
    accessDays *
      MILLISECONDS_PER_DAY;

  if (
    !Number.isFinite(
      untilMs,
    )
  ) {
    throw new Error(
      "Invalid entitlement grant period.",
    );
  }

  return {
    grantedFrom:
      new Date(
        baseMs,
      ).toISOString(),

    grantedUntil:
      new Date(
        untilMs,
      ).toISOString(),
  };
}

async function itemExists(
  tableName: string,
  keyName: string,
  keyValue: string,
): Promise<boolean> {
  const response =
    await dynamoDb.send(
      new GetItemCommand({
        TableName:
          tableName,

        Key: {
          [keyName]: {
            S: keyValue,
          },
        },

        ProjectionExpression:
          keyName,

        ConsistentRead:
          true,
      }),
    );

  return Boolean(
    response.Item,
  );
}

async function grantOneTimeAccess(
  stripeEvent: Stripe.Event,
  checkout:
    VerifiedCheckout,
): Promise<
  "granted" | "duplicate"
> {
  const {
    session,
    attempt,
  } =
    checkout;

  if (
    attempt.status === "PAID"
  ) {
    const purchaseAlreadyExists =
      await itemExists(
        billingPurchaseTableName,
        "stripeCheckoutSessionId",
        session.id,
      );

    if (purchaseAlreadyExists) {
      return "duplicate";
    }

    throw new Error(
      "CheckoutAttempt is PAID but BillingPurchase is missing.",
    );
  }

  const paidAt =
    new Date(
      stripeEvent.created *
        1000,
    );

  const paidAtIso =
    paidAt.toISOString();

  const paymentIntentId =
    getPaymentIntentId(
      session,
    );

  for (
    let retry = 0;
    retry <
      MAX_ENTITLEMENT_RETRIES;
    retry += 1
  ) {
    const entitlement =
      await getEntitlement(
        attempt.userId,
      );

    if (entitlement.exists && entitlement.history.verified) {
      const verifiedVersion = await preflightRefundHistory(attempt.userId);
      if (verifiedVersion !== entitlement.version) continue;
    }

    if (entitlement.exists && !Number.isSafeInteger(entitlement.version + 1)) {
      throw new Error("Entitlement version exhausted.");
    }
    const {
      grantedFrom,
      grantedUntil,
    } =
      calculateGrantPeriod(
        entitlement,
        attempt.accessDays,
        paidAt,
      );

    // Absent Entitlement is meaningful ONLY under the audited inventory invariant:
    // every pre-cutover identity/session owner has a retained anchor, even if unverified.
    const bootstrapCutover = !entitlement.exists ? process.env.PURCHASE_HISTORY_CUTOVER_ID?.trim() : undefined;
    if (bootstrapCutover && !/^[A-Za-z0-9_-]{8,128}$/.test(bootstrapCutover)) {
      throw new Error("Invalid purchase history cutover configuration.");
    }
    // Append unverified when the operational boundary has not been certified.
    const history = entitlement.exists ? entitlement.history : { head: null, count: 0 };
    if (!Number.isSafeInteger(history.count + 1)) throw new Error("Purchase history counter exhausted.");
    const processedAt =
      new Date()
        .toISOString();

    const entitlementValues:
      Record<
        string,
        AttributeValue
      > = {
        ":productCode": {
          S: "PREMIUM",
        },

        ":accessUntil": {
          S: grantedUntil,
        },

        ":source": {
          S:
            "STRIPE_ONE_TIME",
        },

        ":updatedAt": {
          S: processedAt,
        },

        ":newVersion": {
          N: String(
            entitlement.exists
              ? entitlement.version +
                  1
              : 1,
          ),
        },

        ":historyCount": { N: String(history.count + 1) },
        ":purchaseId": {
          S: session.id,
        },
      };

    if (bootstrapCutover) {
      entitlementValues[":verifiedHistory"] = { S: "VERIFIED_V1" };
      entitlementValues[":cutover"] = { S: bootstrapCutover };
    }

    let entitlementCondition:
      string;

    if (
      entitlement.exists
    ) {
      entitlementCondition =
        "#version = :expectedVersion";

      entitlementValues[
        ":expectedVersion"
      ] = {
        N: String(
          entitlement.version,
        ),
      };
    } else {
      entitlementCondition =
        "attribute_not_exists(userId)";
    }

    try {
      await dynamoDb.send(
        new TransactWriteItemsCommand({
          TransactItems: [
            {
              Put: {
                TableName:
                  stripeEventTableName,

                Item: {
                  eventId: {
                    S:
                      stripeEvent.id,
                  },

                  eventType: {
                    S:
                      stripeEvent.type,
                  },

                  stripeCreatedAt: {
                    N: String(
                      stripeEvent
                        .created,
                    ),
                  },

                  processedAt: {
                    S:
                      processedAt,
                  },

                  checkoutAttemptId: {
                    S:
                      attempt
                        .checkoutAttemptId,
                  },

                  checkoutSessionId: {
                    S:
                      session.id,
                  },

                  outcome: {
                    S:
                      "ACCESS_GRANTED",
                  },
                },

                ConditionExpression:
                  "attribute_not_exists(eventId)",
              },
            },

            {
              Put: {
                TableName:
                  billingPurchaseTableName,

                Item: {
                  purchaseHistoryPrevious: history.head ? { S: history.head } : { NULL: true },
                  purchaseHistorySequence: { N: String(history.count + 1) },
                  stripeCheckoutSessionId:
                    {
                      S:
                        session.id,
                    },

                  checkoutAttemptId: {
                    S:
                      attempt
                        .checkoutAttemptId,
                  },

                  userId: {
                    S:
                      attempt.userId,
                  },

                  stripeCustomerId: {
                    S:
                      attempt
                        .stripeCustomerId,
                  },

                  stripePaymentIntentId: {
                    S:
                      paymentIntentId,
                  },

                  planCode: {
                    S:
                      attempt.planCode,
                  },

                  billingContractVersion: {
                    S:
                      attempt
                        .billingContractVersion,
                  },

                  stripePriceId: {
                    S:
                      attempt
                        .stripePriceId,
                  },

                  amountTotal: {
                    N: String(
                      attempt
                        .amountTotal,
                    ),
                  },

                  currency: {
                    S:
                      attempt.currency,
                  },

                  paidAt: {
                    S:
                      paidAtIso,
                  },

                  accessDays: {
                    N: String(
                      attempt
                        .accessDays,
                    ),
                  },

                  grantedFrom: {
                    S:
                      grantedFrom,
                  },

                  grantedUntil: {
                    S:
                      grantedUntil,
                  },

                  eventId: {
                    S:
                      stripeEvent.id,
                  },

                  termsVersion: {
                    S:
                      attempt
                        .termsVersion,
                  },

                  privacyVersion: {
                    S:
                      attempt
                        .privacyVersion,
                  },

                  checkoutConsentVersion: {
                    S:
                      attempt
                        .checkoutConsentVersion,
                  },

                  immediateDeliveryConsent: {
                    BOOL:
                      true,
                  },

                  withdrawalRightLossAcknowledged:
                    {
                      BOOL:
                        true,
                    },

                  consentedAt: {
                    S:
                      attempt
                        .consentedAt,
                  },
                },

                ConditionExpression:
                  "attribute_not_exists(stripeCheckoutSessionId)",
              },
            },

            {
              Update: {
                TableName:
                  entitlementTableName,

                Key: {
                  userId: {
                    S:
                      attempt.userId,
                  },
                },

                UpdateExpression:
                  "SET productCode = :productCode, " +
                  "accessUntil = :accessUntil, " +
                  "#source = :source, " +
                  "updatedAt = :updatedAt, " +
                  "#version = :newVersion, " +
                  "lastPurchaseId = :purchaseId, " +
                  "purchaseHistoryHead = :purchaseId, purchaseHistoryCount = :historyCount " +
                  (bootstrapCutover ? ", purchaseHistoryState = :verifiedHistory, purchaseHistoryCutoverId = :cutover " : "") +
                  "REMOVE revokedAt, revocationReason",

                ConditionExpression:
                  entitlementCondition,

                ExpressionAttributeNames: {
                  "#source":
                    "source",
                  "#version":
                    "version",
                },

                ExpressionAttributeValues:
                  entitlementValues,
              },
            },

            {
              Update: {
                TableName:
                  checkoutAttemptTableName,

                Key: {
                  checkoutAttemptId: {
                    S:
                      attempt
                        .checkoutAttemptId,
                  },
                },

                UpdateExpression:
                  "SET #status = :paidStatus, " +
                  "stripeCheckoutSessionId = :sessionId, " +
                  "paidAt = :paidAt, " +
                  "updatedAt = :processedAt",

                ConditionExpression:
                  "#status = :createdStatus AND " +
                  "userId = :userId AND " +
                  "stripeCustomerId = :stripeCustomerId AND " +
                  "planCode = :planCode AND " +
                  "billingContractVersion = :billingContractVersion AND " +
                  "stripePriceId = :stripePriceId AND " +
                  "amountTotal = :amountTotal AND " +
                  "currency = :currency AND " +
                  "checkoutMode = :checkoutMode AND " +
                  "accessDays = :accessDays AND " +
                  "termsVersion = :termsVersion AND " +
                  "privacyVersion = :privacyVersion AND " +
                  "checkoutConsentVersion = :checkoutConsentVersion AND " +
                  "immediateDeliveryConsent = :trueValue AND " +
                  "withdrawalRightLossAcknowledged = :trueValue",

                ExpressionAttributeNames: {
                  "#status":
                    "status",
                },

                ExpressionAttributeValues: {
                  ":paidStatus": {
                    S: "PAID",
                  },

                  ":createdStatus": {
                    S: "CREATED",
                  },

                  ":sessionId": {
                    S: session.id,
                  },

                  ":paidAt": {
                    S: paidAtIso,
                  },

                  ":processedAt": {
                    S: processedAt,
                  },

                  ":userId": {
                    S: attempt.userId,
                  },

                  ":stripeCustomerId": {
                    S:
                      attempt
                        .stripeCustomerId,
                  },

                  ":planCode": {
                    S: attempt.planCode,
                  },

                  ":billingContractVersion": {
                    S:
                      attempt
                        .billingContractVersion,
                  },

                  ":stripePriceId": {
                    S:
                      attempt
                        .stripePriceId,
                  },

                  ":amountTotal": {
                    N: String(
                      attempt
                        .amountTotal,
                    ),
                  },

                  ":currency": {
                    S: attempt.currency,
                  },

                  ":checkoutMode": {
                    S:
                      attempt
                        .checkoutMode,
                  },

                  ":accessDays": {
                    N: String(
                      attempt
                        .accessDays,
                    ),
                  },

                  ":termsVersion": {
                    S:
                      attempt
                        .termsVersion,
                  },

                  ":privacyVersion": {
                    S:
                      attempt
                        .privacyVersion,
                  },

                  ":checkoutConsentVersion": {
                    S:
                      attempt
                        .checkoutConsentVersion,
                  },

                  ":trueValue": {
                    BOOL: true,
                  },
                },
              },
            },
          ],
        }),
      );

      return "granted";
    } catch (error) {
      if (
        !isTransactionCanceled(
          error,
        )
      ) {
        throw error;
      }

      const [
        eventAlreadyExists,
        purchaseAlreadyExists,
        latestAttempt,
      ] =
        await Promise.all([
          itemExists(
            stripeEventTableName,
            "eventId",
            stripeEvent.id,
          ),

          itemExists(
            billingPurchaseTableName,
            "stripeCheckoutSessionId",
            session.id,
          ),

          getCheckoutAttempt(
            attempt
              .checkoutAttemptId,
          ),
        ]);

      if (
        purchaseAlreadyExists
      ) {
        return "duplicate";
      }

      if (
        eventAlreadyExists ||
        latestAttempt.status ===
          "PAID"
      ) {
        throw new Error(
          "Inconsistent billing transaction state.",
        );
      }

      /*
       * Neither billing idempotency key exists and the attempt is still
       * CREATED. The remaining expected conditional conflict is the
       * Entitlement optimistic lock, so re-read and retry from scratch.
       */
    }
  }

  throw new Error(
    "Entitlement update concurrency limit exceeded.",
  );
}

export const handler:
  APIGatewayProxyHandlerV2 =
  async (event) => {
    const signature =
      getStripeSignature(
        event,
      );

    if (!signature) {
      return jsonResponse(
        400,
        {
          error:
            "Invalid webhook request.",
        },
      );
    }

    let rawBody:
      string | Buffer;

    try {
      rawBody =
        getRawBody(event);
    } catch {
      return jsonResponse(
        400,
        {
          error:
            "Invalid webhook request.",
        },
      );
    }

    let stripeEvent:
      Stripe.Event;

    try {
      stripeEvent =
        Stripe.webhooks
          .constructEvent(
            rawBody,
            signature,
            env
              .STRIPE_WEBHOOK_SECRET,
          );
    } catch {
      console.warn(
        "Rejected Stripe webhook with invalid signature.",
      );

      return jsonResponse(
        400,
        {
          error:
            "Invalid webhook signature.",
        },
      );
    }

    if (
      !ALLOWED_EVENT_TYPES.has(stripeEvent.type) &&
      !REFUND_EVENT_TYPES.has(stripeEvent.type)
    ) {
      return jsonResponse(
        200,
        {
          received: true,
          ignored: true,
        },
      );
    }

    try {
      if (REFUND_EVENT_TYPES.has(stripeEvent.type)) {
        const expectedLive = getExpectedLivemode();
        if (stripeEvent.livemode !== expectedLive) {
          throw new WebhookContractError("refund_event_wrong_livemode");
        }
        let observation;
        try {
          observation = await applyRefundObservation(
            stripeEvent.data.object as Stripe.Refund, stripeEvent.id, stripeEvent.created,
          );
        } catch (error) {
          if (error instanceof RefundCorrelationIncident) {
            await recordExternalRefundReview(stripeEvent.data.object as Stripe.Refund, `incident_${stripeEvent.id}`, error.reason);
            console.error("Refund correlation incident requires ADMIN investigation", { eventId: stripeEvent.id, reason: error.reason });
            throw error; // Preserve HTTP 5xx, Stripe retries and operational alerting.
          }
          if (!(error instanceof MissingRefundCorrelation)) throw error;
          await recordExternalRefundReview(stripeEvent.data.object as Stripe.Refund, stripeEvent.id, error.reason);
          console.warn("External refund requires ADMIN review", { eventId: stripeEvent.id, reason: error.reason });
          return jsonResponse(200, { received: true, reviewRequired: true });
        }
        console.info("Refund webhook reconciled", {
          eventId: stripeEvent.id,
          outcome: observation.outcome,
        });
        return jsonResponse(200, { received: true });
      }

      const checkout =
        await verifyCheckoutContract(
          stripeEvent,
        );

      if (
        stripeEvent.type ===
          "checkout.session.completed" &&
        checkout.session
          .payment_status ===
          "unpaid"
      ) {
        await recordEventOnly(
          stripeEvent,
          checkout.attempt
            .checkoutAttemptId,
          checkout.session.id,
          "PAYMENT_PENDING",
        );

        return jsonResponse(
          200,
          {
            received: true,
            pending: true,
          },
        );
      }

      if (
        stripeEvent.type ===
          "checkout.session.async_payment_failed"
      ) {
        await recordEventOnly(
          stripeEvent,
          checkout.attempt
            .checkoutAttemptId,
          checkout.session.id,
          "PAYMENT_FAILED",
        );

        return jsonResponse(
          200,
          {
            received: true,
          },
        );
      }

      if (
        checkout.session
          .payment_status !==
        "paid"
      ) {
        throw new WebhookContractError(
          "payment_not_paid",
        );
      }

      const result =
        await grantOneTimeAccess(
          stripeEvent,
          checkout,
        );

      console.info(
        "Processed Stripe payment webhook.",
        {
          eventId:
            stripeEvent.id,
          eventType:
            stripeEvent.type,
          result,
        },
      );

      return jsonResponse(
        200,
        {
          received: true,
          duplicate:
            result ===
            "duplicate",
        },
      );
    } catch (error) {
      if (
        error instanceof
        WebhookContractError
      ) {
        console.error(
          "Stripe webhook violated billing contract.",
          {
            eventId:
              stripeEvent.id,
            eventType:
              stripeEvent.type,
            reason:
              error.code,
          },
        );
      } else {
        console.error(
          "Failed to process Stripe webhook.",
          {
            eventId:
              stripeEvent.id,
            eventType:
              stripeEvent.type,
            errorName:
              error instanceof Error
                ? error.name
                : "UnknownError",
          },
        );
      }

      /*
       * Stripe will retry 5xx responses. The API Gateway 5xx alarm in
       * backend.ts ensures handled failures are still operationally visible.
       */
      return jsonResponse(
        500,
        {
          error:
            "Webhook processing failed.",
        },
      );
    }
  };
