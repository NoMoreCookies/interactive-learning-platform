import type {
  PreSignUpTriggerHandler,
} from "aws-lambda";

import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
} from "../../shared/legal-versions";

export const handler: PreSignUpTriggerHandler =
  async (event) => {
    const attributes =
      event.request.userAttributes;

    const termsVersion =
      attributes["custom:terms_version"];

    const privacyVersion =
      attributes["custom:privacy_version"];

    if (!termsVersion) {
      throw new Error(
        "Brak informacji o zaakceptowanej wersji Regulaminu.",
      );
    }

    if (!privacyVersion) {
      throw new Error(
        "Brak informacji o wersji Polityki prywatności.",
      );
    }

    if (
      termsVersion !==
      CURRENT_TERMS_VERSION
    ) {
      throw new Error(
        "Nieprawidłowa wersja Regulaminu.",
      );
    }

    if (
      privacyVersion !==
      CURRENT_PRIVACY_VERSION
    ) {
      throw new Error(
        "Nieprawidłowa wersja Polityki prywatności.",
      );
    }

    return event;
  };