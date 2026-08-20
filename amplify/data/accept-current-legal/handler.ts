import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";

import {
  getAmplifyDataClientConfig,
} from "@aws-amplify/backend/function/runtime";

import {
  env,
} from "$amplify/env/accept-current-legal";

import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
} from "../../../lib/legal";

import type { Schema } from "../resource";

const {
  resourceConfig,
  libraryOptions,
} = await getAmplifyDataClientConfig(
  env,
);

Amplify.configure(
  resourceConfig,
  libraryOptions,
);

const client =
  generateClient<Schema>();

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

    const userId = identity.sub;

    const owner =
      `${identity.sub}::${identity.username}`;

    const acceptedAt =
      new Date().toISOString();

    const { errors } =
      await client.models.LegalAcceptance.create({
        userId,
        owner,
        termsVersion:
          CURRENT_TERMS_VERSION,
        privacyVersion:
          CURRENT_PRIVACY_VERSION,
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

    return acceptedAt;
  };