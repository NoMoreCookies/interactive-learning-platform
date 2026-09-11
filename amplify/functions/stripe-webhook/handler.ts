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

import {
  env,
} from "$amplify/env/stripe-webhook";

import {
  BILLING_CONTRACT_VERSION,
  BILLING_PLANS,
  isBillingPlanCode,
  type BillingPlanCode,
} from "../../shared/billing-plans";

const dynamoDb =
  new DynamoDBClient({});

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

type VerifiedCheckout = {
  session: Stripe.Checkout.Session;
  userId: string;
  stripeCustomerId: string;
  planCode: BillingPlanCode;
  termsVersion: string;
  privacyVersion: string;
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
    };

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
    env.STRIPE_EXPECTED_LIVEMODE;

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
): string | null {
  const paymentIntent =
    session.payment_intent;

  if (
    typeof paymentIntent ===
    "string"
  ) {
    return paymentIntent;
  }

  if (
    paymentIntent &&
    typeof paymentIntent.id ===
      "string"
  ) {
    return paymentIntent.id;
  }

  return null;
}

async function getStoredCustomerId(
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

        ConsistentRead: true,
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

  const rawPlanCode =
    requireMetadata(
      session,
      "planCode",
    );

  if (
    !isBillingPlanCode(
      rawPlanCode,
    )
  ) {
    throw new WebhookContractError(
      "invalid_plan_code",
    );
  }

  const planCode =
    rawPlanCode;

  const plan =
    BILLING_PLANS[
      planCode
    ];

  if (
    session.mode !==
      plan.checkoutMode
  ) {
    throw new WebhookContractError(
      "wrong_checkout_mode",
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

  if (
    session.currency !==
      plan.currency ||
    session.amount_total !==
      plan.unitAmount
  ) {
    throw new WebhookContractError(
      "wrong_amount_or_currency",
    );
  }

  const contractVersion =
    requireMetadata(
      session,
      "billingContractVersion",
    );

  if (
    contractVersion !==
    BILLING_CONTRACT_VERSION
  ) {
    throw new WebhookContractError(
      "wrong_contract_version",
    );
  }

  const metadataPriceId =
    requireMetadata(
      session,
      "stripePriceId",
    );

  if (
    metadataPriceId !==
      getStripePriceId(
        planCode,
      )
  ) {
    throw new WebhookContractError(
      "wrong_price_id",
    );
  }

  const userId =
    requireMetadata(
      session,
      "appUserId",
    );

  if (
    session
      .client_reference_id !==
    userId
  ) {
    throw new WebhookContractError(
      "user_reference_mismatch",
    );
  }

  const stripeCustomerId =
    getStripeCustomerId(
      session,
    );

  const storedCustomerId =
    await getStoredCustomerId(
      userId,
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

  const termsVersion =
    requireMetadata(
      session,
      "termsVersion",
    );

  const privacyVersion =
    requireMetadata(
      session,
      "privacyVersion",
    );

  return {
    session,
    userId,
    stripeCustomerId,
    planCode,
    termsVersion,
    privacyVersion,
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
  sessionId: string,
  outcome: string,
): Promise<void> {
  try {
    await dynamoDb.send(
      new PutItemCommand({
        TableName:
          env
            .STRIPE_EVENT_TABLE_NAME,

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
          env
            .ENTITLEMENT_TABLE_NAME,

        Key: {
          userId: {
            S: userId,
          },
        },

        ProjectionExpression:
          "accessUntil, revokedAt, #version",

        ExpressionAttributeNames: {
          "#version":
            "version",
        },

        ConsistentRead: true,
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
    !versionText
  ) {
    throw new Error(
      "Invalid entitlement record.",
    );
  }

  const accessUntilMs =
    Date.parse(
      accessUntil,
    );

  const version =
    Number(
      versionText,
    );

  if (
    !Number.isFinite(
      accessUntilMs,
    ) ||
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
  };
}

function calculateGrantPeriod(
  entitlement:
    EntitlementSnapshot,
  accessDays: number,
  grantRequestedAt:
    Date,
) {
  const nowMs =
    grantRequestedAt
      .getTime();

  let baseMs =
    nowMs;

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
      nowMs
    ) {
      baseMs =
        currentUntilMs;
    }
  }

  const untilMs =
    baseMs +
    accessDays *
      MILLISECONDS_PER_DAY;

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

        ConsistentRead: true,
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
    userId,
    stripeCustomerId,
    planCode,
    termsVersion,
    privacyVersion,
  } =
    checkout;

  const plan =
    BILLING_PLANS[
      planCode
    ];

  const grantRequestedAt =
    new Date();

  for (
    let attempt = 0;
    attempt <
      MAX_ENTITLEMENT_RETRIES;
    attempt += 1
  ) {
    const entitlement =
      await getEntitlement(
        userId,
      );

    const {
      grantedFrom,
      grantedUntil,
    } =
      calculateGrantPeriod(
        entitlement,
        plan.accessDays,
        grantRequestedAt,
      );

    const processedAt =
      new Date()
        .toISOString();

    const paymentIntentId =
      getPaymentIntentId(
        session,
      );

    const values:
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

        ":purchaseId": {
          S: session.id,
        },
      };

    let condition:
      string;

    if (
      entitlement.exists
    ) {
      condition =
        "#version = :expectedVersion";

      values[
        ":expectedVersion"
      ] = {
        N: String(
          entitlement.version,
        ),
      };
    } else {
      condition =
        "attribute_not_exists(userId)";
    }

    try {
      await dynamoDb.send(
        new TransactWriteItemsCommand({
          TransactItems: [
            {
              Put: {
                TableName:
                  env
                    .STRIPE_EVENT_TABLE_NAME,

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
                  env
                    .BILLING_PURCHASE_TABLE_NAME,

                Item: {
                  stripeCheckoutSessionId:
                    {
                      S:
                        session.id,
                    },

                  userId: {
                    S:
                      userId,
                  },

                  stripeCustomerId: {
                    S:
                      stripeCustomerId,
                  },

                  planCode: {
                    S:
                      planCode,
                  },

                  amountTotal: {
                    N: String(
                      session
                        .amount_total,
                    ),
                  },

                  currency: {
                    S:
                      session
                        .currency ??
                      "",
                  },

                  paidAt: {
                    S:
                      new Date(
                        stripeEvent
                          .created *
                          1000,
                      ).toISOString(),
                  },

                  accessDays: {
                    N: String(
                      plan.accessDays,
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
                      termsVersion,
                  },

                  privacyVersion: {
                    S:
                      privacyVersion,
                  },

                  ...(paymentIntentId
                    ? {
                        stripePaymentIntentId:
                          {
                            S:
                              paymentIntentId,
                          },
                      }
                    : {}),
                },

                ConditionExpression:
                  "attribute_not_exists(stripeCheckoutSessionId)",
              },
            },

            {
              Update: {
                TableName:
                  env
                    .ENTITLEMENT_TABLE_NAME,

                Key: {
                  userId: {
                    S:
                      userId,
                  },
                },

                UpdateExpression:
                  "SET productCode = :productCode, " +
                  "accessUntil = :accessUntil, " +
                  "#source = :source, " +
                  "updatedAt = :updatedAt, " +
                  "#version = :newVersion, " +
                  "lastPurchaseId = :purchaseId " +
                  "REMOVE revokedAt, revocationReason",

                ConditionExpression:
                  condition,

                ExpressionAttributeNames: {
                  "#source":
                    "source",
                  "#version":
                    "version",
                },

                ExpressionAttributeValues:
                  values,
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
      ] =
        await Promise.all([
          itemExists(
            env
              .STRIPE_EVENT_TABLE_NAME,
            "eventId",
            stripeEvent.id,
          ),

          itemExists(
            env
              .BILLING_PURCHASE_TABLE_NAME,
            "stripeCheckoutSessionId",
            session.id,
          ),
        ]);

      if (
        purchaseAlreadyExists
      ) {
        return "duplicate";
      }

      if (
        eventAlreadyExists
      ) {
        throw new Error(
          "Inconsistent billing transaction state.",
        );
      }

      /*
       * Neither idempotency key exists, therefore the most
       * likely cause is the Entitlement optimistic-lock check.
       * Re-read and retry.
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
      !ALLOWED_EVENT_TYPES.has(
        stripeEvent.type,
      )
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

      return jsonResponse(
        500,
        {
          error:
            "Webhook processing failed.",
        },
      );
    }
  };