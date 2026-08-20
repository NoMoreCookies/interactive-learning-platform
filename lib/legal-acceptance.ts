import { generateClient } from "aws-amplify/data";

import type { Schema } from "@/amplify/data/resource";

import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
} from "@/lib/legal";

const client = generateClient<Schema>();

export type LegalUpdateRequirement =
  | "none"
  | "terms"
  | "privacy"
  | "both";

export async function getLegalUpdateRequirement(): Promise<LegalUpdateRequirement> {
  const { data, errors } =
    await client.models.LegalAcceptance.list();

  if (errors?.length) {
    console.error(
      "Failed to load legal acceptances:",
      errors,
    );

    throw new Error(
      "Nie udało się sprawdzić zaakceptowanych dokumentów.",
    );
  }

  if (!data.length) {
    return "both";
  }

  const latestAcceptance = [...data].sort(
    (first, second) =>
      new Date(
        second.acceptedAt,
      ).getTime() -
      new Date(
        first.acceptedAt,
      ).getTime(),
  )[0];

  const hasCurrentTerms =
    latestAcceptance.termsVersion ===
    CURRENT_TERMS_VERSION;

  const hasCurrentPrivacy =
    latestAcceptance.privacyVersion ===
    CURRENT_PRIVACY_VERSION;

  if (
    hasCurrentTerms &&
    hasCurrentPrivacy
  ) {
    return "none";
  }

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
  const { errors } =
    await client.mutations.acceptCurrentLegal();

  if (errors?.length) {
    console.error(
      "Failed to accept current legal documents:",
      errors,
    );

    throw new Error(
      "Nie udało się zapisać akceptacji dokumentów.",
    );
  }
}