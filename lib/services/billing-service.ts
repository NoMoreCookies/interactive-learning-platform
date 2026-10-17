import {
  amplifyClient,
} from "@/lib/amplify-client";

export type BillingPlanCode =
  "ONE_MONTH";

export type PremiumStatus = {
  active: boolean;
  accessUntil: string | null;
};

export type CheckoutConsents = {
  immediateDeliveryConsent:
    boolean;

  withdrawalRightLossAcknowledged:
    boolean;
};

export type CreateCheckoutSessionResult =
  | {
      status: "READY";
      url: string;
      retryAfterSeconds: null;
    }
  | {
      status: "RATE_LIMITED";
      url: null;
      retryAfterSeconds: number;
    };

export type CheckoutResult = {
  status:
    | "PROCESSING"
    | "COMPLETED";

  accessUntil:
    string | null;
};

/*
 * Starts a server-side Stripe Checkout flow.
 *
 * The browser may select only:
 * - a trusted plan code,
 * - the two explicit checkout declarations.
 *
 * Authoritative purchase data such as userId, price, currency,
 * access duration, legal versions and timestamps is resolved by
 * trusted backend code.
 */
export async function createCheckoutSession(
  planCode: BillingPlanCode,
  consents: CheckoutConsents,
): Promise<CreateCheckoutSessionResult> {
  /*
   * Frontend validation improves UX only.
   *
   * The backend independently requires both declarations to be
   * exactly true and persists the authoritative consent snapshot.
   */
  if (
    consents
      .immediateDeliveryConsent !==
      true ||
    consents
      .withdrawalRightLossAcknowledged !==
      true
  ) {
    throw new Error(
      "Musisz potwierdzić wymagane oświadczenia przed rozpoczęciem płatności.",
    );
  }

  const {
    data,
    errors,
  } =
    await amplifyClient.mutations
      .createCheckoutSession(
        {
          planCode,

          immediateDeliveryConsent:
            consents
              .immediateDeliveryConsent,

          withdrawalRightLossAcknowledged:
            consents
              .withdrawalRightLossAcknowledged,
        },
        {
          authMode:
            "userPool",
        },
      );

  if (errors?.length) {
    console.error(
      "Failed to create checkout session.",
      errors.map((error) => ({
        errorType:
          error.errorType,

        message:
          error.message,
      })),
    );

    throw new Error(
      "Nie udało się rozpocząć płatności.",
    );
  }

  if (!data) {
    throw new Error(
      "Backend nie zwrócił wyniku rozpoczęcia płatności.",
    );
  }

  if (
    data.status ===
    "READY"
  ) {
    if (
      typeof data.url !==
        "string" ||
      !data.url.startsWith(
        "https://checkout.stripe.com/",
      )
    ) {
      throw new Error(
        "Backend zwrócił nieprawidłowy adres płatności.",
      );
    }

    return {
      status:
        "READY",

      url:
        data.url,

      retryAfterSeconds:
        null,
    };
  }

  if (
    data.status ===
    "RATE_LIMITED"
  ) {
    const retryAfterSeconds =
      data.retryAfterSeconds;

    if (
      typeof retryAfterSeconds !==
        "number" ||
      !Number.isInteger(
        retryAfterSeconds,
      ) ||
      retryAfterSeconds < 1 ||
      retryAfterSeconds > 300
    ) {
      throw new Error(
        "Backend zwrócił nieprawidłowy czas ponownej próby.",
      );
    }

    return {
      status:
        "RATE_LIMITED",

      url:
        null,

      retryAfterSeconds,
    };
  }

  /*
   * Fail closed if frontend and backend contracts ever drift apart.
   */
  throw new Error(
    "Backend zwrócił nieprawidłowy status płatności.",
  );
}

export async function getMyPremiumStatus():
  Promise<PremiumStatus> {
  const {
    data,
    errors,
  } =
    await amplifyClient.queries
      .getMyPremiumStatus();

  if (errors?.length) {
    console.error(
      "Failed to load Premium status.",
      errors.map((error) => ({
        errorType:
          error.errorType,

        message:
          error.message,
      })),
    );

    throw new Error(
      "Nie udało się pobrać statusu Premium.",
    );
  }

  if (!data) {
    throw new Error(
      "Backend nie zwrócił statusu Premium.",
    );
  }

  return {
    active:
      data.active,

    accessUntil:
      data.accessUntil ??
      null,
  };
}

export async function getMyCheckoutResult(
  sessionId: string,
): Promise<CheckoutResult> {
  const {
    data,
    errors,
  } =
    await amplifyClient.queries
      .getMyCheckoutResult(
        {
          sessionId,
        },
        {
          authMode:
            "userPool",
        },
      );

  if (errors?.length) {
    console.error(
      "Failed to load Checkout result.",
      errors.map((error) => ({
        errorType:
          error.errorType,

        message:
          error.message,
      })),
    );

    throw new Error(
      "Nie udało się potwierdzić płatności.",
    );
  }

  if (!data) {
    throw new Error(
      "Backend nie zwrócił statusu płatności.",
    );
  }

  if (
    data.status !==
      "PROCESSING" &&
    data.status !==
      "COMPLETED"
  ) {
    throw new Error(
      "Backend zwrócił nieprawidłowy status płatności.",
    );
  }

  return {
    status:
      data.status,

    accessUntil:
      data.accessUntil ??
      null,
  };
}
