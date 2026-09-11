import type {
  PostConfirmationTriggerHandler,
} from "aws-lambda";

import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

import {
  buildLegalAcceptanceId,
} from "../../../lib/legal-acceptance-id";

const dynamoDb =
  new DynamoDBClient({});

export const handler: PostConfirmationTriggerHandler =
  async (event) => {
    if (
      event.triggerSource !==
      "PostConfirmation_ConfirmSignUp"
    ) {
      return event;
    }

    const attributes =
      event.request.userAttributes;

    const userId =
      attributes.sub;

    const termsVersion =
      attributes[
        "custom:terms_version"
      ];

    const privacyVersion =
      attributes[
        "custom:privacy_version"
      ];

    if (
      !userId ||
      !termsVersion ||
      !privacyVersion
    ) {
      console.error(
        "Missing required legal acceptance attributes.",
        {
          triggerSource:
            event.triggerSource,

          hasUserId:
            Boolean(userId),

          hasTermsVersion:
            Boolean(termsVersion),

          hasPrivacyVersion:
            Boolean(privacyVersion),
        },
      );

      throw new Error(
        "Brak wymaganych danych dotyczących akceptacji dokumentów.",
      );
    }

    const tableName =
      process.env
        .LEGAL_ACCEPTANCE_TABLE_NAME;

    if (!tableName) {
      console.error(
        "Legal acceptance table name is not configured.",
      );

      throw new Error(
        "Nie udało się zapisać akceptacji dokumentów.",
      );
    }

    const owner =
      `${userId}::${event.userName}`;

    const acceptanceId =
      buildLegalAcceptanceId(
        userId,
        termsVersion,
        privacyVersion,
      );

    const timestamp =
      new Date().toISOString();

    try {
      await dynamoDb.send(
        new PutItemCommand({
          TableName:
            tableName,

          Item: {
            id: {
              S:
                acceptanceId,
            },

            userId: {
              S:
                userId,
            },

            owner: {
              S:
                owner,
            },

            termsVersion: {
              S:
                termsVersion,
            },

            privacyVersion: {
              S:
                privacyVersion,
            },

            acceptedAt: {
              S:
                timestamp,
            },

            createdAt: {
              S:
                timestamp,
            },

            updatedAt: {
              S:
                timestamp,
            },

            __typename: {
              S:
                "LegalAcceptance",
            },
          },

          /*
           * Cognito may retry the trigger.
           *
           * A deterministic acceptance ID together with this
           * condition makes the operation idempotent.
           */
          ConditionExpression:
            "attribute_not_exists(#id)",

          ExpressionAttributeNames: {
            "#id":
              "id",
          },
        }),
      );
    } catch (error) {
      /*
       * The exact same acceptance already exists.
       *
       * This is a successful idempotent outcome rather than
       * an application failure.
       */
      if (
        error instanceof
        ConditionalCheckFailedException
      ) {
        return event;
      }

      console.error(
        "Failed to create legal acceptance.",
        {
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },
      );

      throw new Error(
        "Nie udało się zapisać akceptacji dokumentów.",
      );
    }

    return event;
  };