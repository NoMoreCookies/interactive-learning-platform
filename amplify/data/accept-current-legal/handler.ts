import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
} from "../../shared/legal-versions";

import {
  buildLegalAcceptanceId,
} from "../../../lib/legal-acceptance-id";

import type { Schema } from "../resource";

const dynamoDb =
  new DynamoDBClient({});

export const handler: Schema["acceptCurrentLegal"]["functionHandler"] =
  async (event) => {
    const identity = event.identity;

    if (
      !identity ||
      !("sub" in identity) ||
      !("username" in identity) ||
      typeof identity.sub !== "string" ||
      typeof identity.username !== "string"
    ) {
      throw new Error(
        "Nie udało się ustalić tożsamości użytkownika.",
      );
    }

    const {
      termsVersion:
        requestedTermsVersion,
      privacyVersion:
        requestedPrivacyVersion,
    } = event.arguments;

    if (
      requestedTermsVersion !==
        CURRENT_TERMS_VERSION ||
      requestedPrivacyVersion !==
        CURRENT_PRIVACY_VERSION
    ) {
      console.error(
        "Legal version mismatch.",
        {
          requestedTermsVersion,
          requestedPrivacyVersion,
          currentTermsVersion:
            CURRENT_TERMS_VERSION,
          currentPrivacyVersion:
            CURRENT_PRIVACY_VERSION,
        },
      );

      throw new Error(
        "Wersja dokumentów uległa zmianie. Odśwież stronę i spróbuj ponownie.",
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

    const userId =
      identity.sub;

    const owner =
      `${identity.sub}::${identity.username}`;

    /*
     * We intentionally use server-side versions
     * after validating the client's expected versions.
     */
    const termsVersion =
      CURRENT_TERMS_VERSION;

    const privacyVersion =
      CURRENT_PRIVACY_VERSION;

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
          TableName: tableName,

          Item: {
            id: {
              S: acceptanceId,
            },

            userId: {
              S: userId,
            },

            owner: {
              S: owner,
            },

            termsVersion: {
              S: termsVersion,
            },

            privacyVersion: {
              S: privacyVersion,
            },

            acceptedAt: {
              S: timestamp,
            },

            createdAt: {
              S: timestamp,
            },

            updatedAt: {
              S: timestamp,
            },

            __typename: {
              S: "LegalAcceptance",
            },
          },

          ConditionExpression:
            "attribute_not_exists(#id)",

          ExpressionAttributeNames: {
            "#id": "id",
          },
        }),
      );

      return true;
    } catch (error) {
      if (
        error instanceof
        ConditionalCheckFailedException
      ) {
        return true;
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
  };