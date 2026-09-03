import type {
  PostConfirmationTriggerHandler,
} from "aws-lambda";

import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";

import {
  getAmplifyDataClientConfig,
} from "@aws-amplify/backend/function/runtime";

import {
  env,
} from "$amplify/env/post-confirmation";

import {
  buildLegalAcceptanceId,
} from "../../../lib/legal-acceptance-id";

import type {
  Schema,
} from "../../data/resource";

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

    const owner =
      `${userId}::${event.userName}`;

    const acceptanceId =
      buildLegalAcceptanceId(
        userId,
        termsVersion,
        privacyVersion,
      );

    const acceptedAt =
      new Date().toISOString();

    const { errors } =
      await client.models.LegalAcceptance.create({
        id: acceptanceId,
        userId,
        owner,
        termsVersion,
        privacyVersion,
        acceptedAt,
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