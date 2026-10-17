import { getCurrentUser } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";

import type { Schema } from "@/amplify/data/resource";

import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
} from "@/lib/legal";

const client = generateClient<Schema>();

const LEGAL_ACCEPTANCE_PAGE_SIZE = 100;
const MAX_LEGAL_ACCEPTANCE_PAGES = 20;

export type LegalUpdateRequirement =
  | "none"
  | "terms"
  | "privacy"
  | "both";

export async function getLegalUpdateRequirement(): Promise<LegalUpdateRequirement> {
  const { userId } =
    await getCurrentUser();

  let hasCurrentTerms = false;
  let hasCurrentPrivacy = false;

  let nextToken:
    | string
    | null
    | undefined;

  let pageCount = 0;

  const seenNextTokens =
    new Set<string>();

  do {
    pageCount += 1;

    if (
      pageCount >
      MAX_LEGAL_ACCEPTANCE_PAGES
    ) {
      console.error(
        "Legal acceptance pagination exceeded the maximum page limit.",
      );

      throw new Error(
        "Nie udało się bezpiecznie sprawdzić zaakceptowanych dokumentów.",
      );
    }

    const {
      data,
      errors,
      nextToken: newNextToken,
    } =
      await client.models.LegalAcceptance.list(
        {
          filter: {
            userId: {
              eq: userId,
            },
          },
          limit:
            LEGAL_ACCEPTANCE_PAGE_SIZE,
          nextToken,
        },
      );

    if (errors?.length) {
      console.error(
        "Failed to load legal acceptances:",
        errors,
      );

      throw new Error(
        "Nie udało się sprawdzić zaakceptowanych dokumentów.",
      );
    }

    hasCurrentTerms =
      hasCurrentTerms ||
      data.some(
        (acceptance) =>
          acceptance.termsVersion ===
          CURRENT_TERMS_VERSION,
      );

    hasCurrentPrivacy =
      hasCurrentPrivacy ||
      data.some(
        (acceptance) =>
          acceptance.privacyVersion ===
          CURRENT_PRIVACY_VERSION,
      );

    if (
      hasCurrentTerms &&
      hasCurrentPrivacy
    ) {
      return "none";
    }

    if (newNextToken) {
      if (
        seenNextTokens.has(
          newNextToken,
        )
      ) {
        console.error(
          "Legal acceptance pagination returned a repeated nextToken.",
        );

        throw new Error(
          "Nie udało się bezpiecznie sprawdzić zaakceptowanych dokumentów.",
        );
      }

      seenNextTokens.add(
        newNextToken,
      );
    }

    nextToken = newNextToken;
  } while (nextToken);

  if (
    !hasCurrentTerms &&
    !hasCurrentPrivacy
  ) {
    return "both";
  }

  if (!hasCurrentTerms) {
    return "terms";
  }

  return "privacy";
}

export async function acceptCurrentLegal(): Promise<void> {
  const { data, errors } =
    await client.mutations.acceptCurrentLegal({
      termsVersion:
        CURRENT_TERMS_VERSION,
      privacyVersion:
        CURRENT_PRIVACY_VERSION,
    });

  if (
    errors?.length ||
    data !== true
  ) {
    console.error(
      "Failed to accept current legal documents:",
      errors,
    );

    throw new Error(
      "Nie udało się zapisać akceptacji dokumentów.",
    );
  }
}