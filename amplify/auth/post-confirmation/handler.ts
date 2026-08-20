import type {
  PostConfirmationTriggerHandler,
} from "aws-lambda";

import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";

import {
  getAmplifyDataClientConfig,
} from "@aws-amplify/backend/function/runtime";

import type { Schema } from "../../data/resource";

const dataClientEnv = {
  AWS_ACCESS_KEY_ID:
    process.env.AWS_ACCESS_KEY_ID!,
  AWS_SECRET_ACCESS_KEY:
    process.env.AWS_SECRET_ACCESS_KEY!,
  AWS_SESSION_TOKEN:
    process.env.AWS_SESSION_TOKEN!,
  AWS_REGION:
    process.env.AWS_REGION!,
  AMPLIFY_DATA_DEFAULT_NAME:
    process.env.AMPLIFY_DATA_DEFAULT_NAME!,
};

const {
  resourceConfig,
  libraryOptions,
} = await getAmplifyDataClientConfig(
  dataClientEnv,
);

Amplify.configure(
  resourceConfig,
  libraryOptions,
);

const client =
  generateClient<Schema>();

export const handler: PostConfirmationTriggerHandler =
  async (event) => {
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

    const legalAcceptedAt =
      attributes[
        "custom:legal_accepted_at"
      ];

    if (
      !userId ||
      !termsVersion ||
      !privacyVersion ||
      !legalAcceptedAt
    ) {
      throw new Error(
        "Brak wymaganych danych dotyczących akceptacji dokumentów.",
      );
    }

    const { errors } =
      await client.models.LegalAcceptance.create({
        userId,
        owner:
          `${userId}::${event.userName}`,
        termsVersion,
        privacyVersion,
        acceptedAt:
          legalAcceptedAt,
      });

    if (errors?.length) {
      console.error(
        "Failed to create legal acceptance:",
        errors,
      );

      throw new Error(
        "Nie udało się zapisać akceptacji dokumentów.",
      );
    }

    return event;
  };