import {
  DynamoDBClient,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";

import type {
  Schema,
} from "../resource";

const dynamoDb =
  new DynamoDBClient({});

function getAuthenticatedUserId(
  identity: unknown,
): string | null {
  if (
    !identity ||
    typeof identity !== "object"
  ) {
    return null;
  }

  const identityRecord =
    identity as Record<
      string,
      unknown
    >;

  if (
    typeof identityRecord.sub ===
      "string" &&
    identityRecord.sub.trim()
  ) {
    return identityRecord.sub.trim();
  }

  const claims =
    identityRecord.claims;

  if (
    claims &&
    typeof claims === "object"
  ) {
    const claimSub = (
      claims as Record<
        string,
        unknown
      >
    ).sub;

    if (
      typeof claimSub ===
        "string" &&
      claimSub.trim()
    ) {
      return claimSub.trim();
    }
  }

  return null;
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

export const handler:
  Schema["getMyCheckoutResult"]["functionHandler"] =
  async (event) => {
    const tableName =
      process.env
        .BILLING_PURCHASE_TABLE_NAME
        ?.trim();

    if (!tableName) {
      console.error(
        "Checkout status table configuration is incomplete.",
      );

      throw new Error(
        "Nie udało się sprawdzić płatności.",
      );
    }

    const userId =
      getAuthenticatedUserId(
        event.identity,
      );

    if (!userId) {
      throw new Error(
        "Brak uprawnień.",
      );
    }

    const sessionId =
      event.arguments
        .sessionId
        .trim();

    if (
      !sessionId.startsWith(
        "cs_",
      ) ||
      sessionId.length > 255
    ) {
      throw new Error(
        "Nieprawidłowy identyfikator płatności.",
      );
    }

    try {
      const result =
        await dynamoDb.send(
          new GetItemCommand({
            TableName:
              tableName,

            Key: {
              stripeCheckoutSessionId:
                {
                  S: sessionId,
                },
            },

            ProjectionExpression:
              "#userId, #grantedUntil",

            ExpressionAttributeNames:
              {
                "#userId":
                  "userId",

                "#grantedUntil":
                  "grantedUntil",
              },

            ConsistentRead: true,
          }),
        );

      /*
       * The webhook may still be processing.
       *
       * Absence of BillingPurchase is therefore not immediately
       * treated as a payment failure.
       */
      if (!result.Item) {
        return {
          status:
            "PROCESSING",

          accessUntil:
            null,
        };
      }

      const storedUserId =
        result.Item
          .userId
          ?.S;

      /*
       * Never expose another user's purchase even if somebody
       * obtains or guesses their Checkout Session ID.
       */
      if (
        !storedUserId ||
        storedUserId !==
          userId
      ) {
        console.warn(
          "Checkout status ownership check failed.",
        );

        throw new Error(
          "Brak uprawnień.",
        );
      }

      const grantedUntil =
        result.Item
          .grantedUntil
          ?.S;

      if (
        !grantedUntil ||
        !isCanonicalIsoTimestamp(
          grantedUntil,
        )
      ) {
        throw new Error(
          "Invalid purchase record.",
        );
      }

      return {
        status:
          "COMPLETED",

        accessUntil:
          grantedUntil,
      };
    } catch (error) {
      console.error(
        "Failed to load checkout result.",
        {
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },
      );

      throw new Error(
        "Nie udało się sprawdzić płatności.",
      );
    }
  };