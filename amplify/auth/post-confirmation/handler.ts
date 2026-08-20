import type {
  PostConfirmationTriggerHandler,
} from "aws-lambda";

import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";

import {
  getAmplifyDataClientConfig,
} from "@aws-amplify/backend/function/runtime";

import { env } from "$amplify/env/post-confirmation";

import type { Schema } from "../../data/resource";

const {
  resourceConfig,
  libraryOptions,
} = await getAmplifyDataClientConfig(env);

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