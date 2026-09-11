import {
  amplifyClient,
} from "@/lib/amplify-client";

export type BillingPlanCode =
  "ONE_MONTH";

export type PremiumStatus = {
  active: boolean;
  accessUntil: string | null;
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
 * The backend may return:
 *
 * READY:
 *   A new Stripe Checkout Session was created successfully.
 *
 * RATE_LIMITED:
 *   The user attempted to create another Checkout Session too soon.
 *
 * Rate limiting is enforced by the backend. The retry value returned
 * here is used only to improve frontend UX.
 */
export async function createCheckoutSession(
  planCode: BillingPlanCode,
): Promise<CreateCheckoutSessionResult> {
  const {
    data,
    errors,
  } =
    await amplifyClient.queries
      .createCheckoutSession(
        {
          planCode,
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

  /*
   * Successful Checkout Session creation.
   */
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

  /*
   * Expected rate-limit response.
   *
   * This is not treated as a backend failure. The frontend can use
   * retryAfterSeconds to display a local countdown without polling
   * AWS.
   */
  if (
    data.status ===
    "RATE_LIMITED"
  ) {
    const retryAfterSeconds =
      data.retryAfterSeconds;

    /*
     * Validate server data before using it in frontend state.
     *
     * 300 seconds is deliberately much larger than the current
     * 20-second backend cooldown while still rejecting obviously
     * malformed values.
     */
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
   * Fail closed if backend and frontend contracts ever drift apart.
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