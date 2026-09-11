"use client";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useAuth,
} from "@/components/auth/AuthProvider";

import {
  createCheckoutSession,
  getMyPremiumStatus,
  type PremiumStatus,
} from "@/lib/services/billing-service";

function formatAccessUntil(
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "pl-PL",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(date);
}

export default function AccountPage() {
  const router =
    useRouter();

  const {
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    logout,
  } =
    useAuth();

  const [
    isLoggingOut,
    setIsLoggingOut,
  ] =
    useState(false);

  const [
    premiumStatus,
    setPremiumStatus,
  ] =
    useState<PremiumStatus | null>(
      null,
    );

  const [
    isPremiumLoading,
    setIsPremiumLoading,
  ] =
    useState(false);

  const [
    premiumError,
    setPremiumError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    isCheckoutLoading,
    setIsCheckoutLoading,
  ] =
    useState(false);

  const [
    checkoutError,
    setCheckoutError,
  ] =
    useState<string | null>(
      null,
    );

  /*
   * Absolute client-side timestamp indicating when the user may
   * try Checkout again.
   *
   * The backend remains the actual security boundary. This value
   * exists only to provide a better user experience.
   */
  const [
    checkoutRetryAt,
    setCheckoutRetryAt,
  ] =
    useState<number | null>(
      null,
    );

  const [
    checkoutCooldownSeconds,
    setCheckoutCooldownSeconds,
  ] =
    useState(0);

  const loadPremiumStatus =
    useCallback(
      async () => {
        if (
          !isAuthenticated ||
          isAdmin
        ) {
          return;
        }

        setIsPremiumLoading(
          true,
        );

        setPremiumError(
          null,
        );

        try {
          const status =
            await getMyPremiumStatus();

          setPremiumStatus(
            status,
          );
        } catch (error) {
          console.error(
            "Failed to load Premium status.",
            {
              errorName:
                error instanceof Error
                  ? error.name
                  : "UnknownError",
            },
          );

          setPremiumError(
            "Nie udało się pobrać statusu Premium.",
          );
        } finally {
          setIsPremiumLoading(
            false,
          );
        }
      },
      [
        isAuthenticated,
        isAdmin,
      ],
    );

  useEffect(() => {
    void loadPremiumStatus();
  }, [
    loadPremiumStatus,
  ]);

  /*
   * Countdown is calculated from an absolute timestamp instead of
   * decrementing a counter blindly every second.
   *
   * Browsers may throttle timers when a tab is in the background.
   * Recalculating from Date.now() keeps the displayed value accurate
   * after the user returns to the page.
   *
   * No AWS requests are made by this timer.
   */
  useEffect(() => {
    if (
      checkoutRetryAt ===
      null
    ) {
      setCheckoutCooldownSeconds(
        0,
      );

      return;
    }

    /*
     * Capture the validated timestamp in a local constant.
     *
     * TypeScript now knows that retryAt is always a number inside
     * updateCooldown(), even though checkoutRetryAt itself has the
     * type number | null.
     */
    const retryAt =
      checkoutRetryAt;

    function updateCooldown() {
      const remainingSeconds =
        Math.max(
          0,
          Math.ceil(
            (
              retryAt -
              Date.now()
            ) /
              1000,
          ),
        );

      setCheckoutCooldownSeconds(
        remainingSeconds,
      );

      if (
        remainingSeconds ===
        0
      ) {
        setCheckoutRetryAt(
          null,
        );
      }
    }

    updateCooldown();

    const intervalId =
      window.setInterval(
        updateCooldown,
        1000,
      );

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [
    checkoutRetryAt,
  ]);

  async function handleLogout() {
    setIsLoggingOut(
      true,
    );

    try {
      await logout();

      router.push("/");
      router.refresh();
    } finally {
      setIsLoggingOut(
        false,
      );
    }
  }

  async function handleCheckout() {
    if (
      isCheckoutLoading ||
      checkoutCooldownSeconds >
        0
    ) {
      return;
    }

    setIsCheckoutLoading(
      true,
    );

    setCheckoutError(
      null,
    );

    try {
      const result =
        await createCheckoutSession(
          "ONE_MONTH",
        );

      /*
       * RATE_LIMITED is an expected business result rather than a
       * technical application failure.
       *
       * The backend has already enforced the real rate limit.
       * The browser merely displays the remaining time locally.
       */
      if (
        result.status ===
        "RATE_LIMITED"
      ) {
        const retryAt =
          Date.now() +
          result
            .retryAfterSeconds *
            1000;

        setCheckoutRetryAt(
          retryAt,
        );

        setCheckoutCooldownSeconds(
          result.retryAfterSeconds,
        );

        setIsCheckoutLoading(
          false,
        );

        return;
      }

      /*
       * Stripe Checkout is hosted by Stripe.
       *
       * Price, duration and user identity were all resolved by
       * our backend before this URL was created.
       */
      window.location.assign(
        result.url,
      );
    } catch (error) {
      console.error(
        "Failed to start Checkout.",
        {
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },
      );

      setCheckoutError(
        "Nie udało się rozpocząć płatności. Spróbuj ponownie.",
      );

      setIsCheckoutLoading(
        false,
      );
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-16">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-zinc-400">
          Pobieranie danych konta...
        </div>
      </main>
    );
  }

  if (
    !isAuthenticated
  ) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-16">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
          <h1 className="text-3xl font-bold">
            Musisz się zalogować
          </h1>

          <p className="mt-3 text-zinc-400">
            Zaloguj się, aby przejść do swojego konta.
          </p>

          <Link
            href="/auth"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Przejdź do logowania
          </Link>
        </div>
      </main>
    );
  }

  const email =
    user?.signInDetails?.loginId ??
    user?.username ??
    "Brak adresu e-mail";

  const formattedAccessUntil =
    formatAccessUntil(
      premiumStatus
        ?.accessUntil ??
        null,
    );

  const isCheckoutBlocked =
    isCheckoutLoading ||
    checkoutCooldownSeconds >
      0;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
        Konto użytkownika
      </p>

      <h1 className="mt-3 text-4xl font-bold">
        Moje konto
      </h1>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-500">
            Adres e-mail
          </p>

          <p className="mt-2 break-all font-semibold text-zinc-100">
            {email}
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-500">
            Typ konta
          </p>

          <p className="mt-2 font-semibold text-zinc-100">
            {isAdmin
              ? "Administrator"
              : "Użytkownik"}
          </p>
        </section>

        <section
          id="premium"
          className="overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-zinc-950 to-zinc-950 p-7 md:col-span-2"
        >
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
                Dostęp Premium
              </p>

              {isAdmin ? (
                <>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

                    <p className="font-semibold text-emerald-300">
                      Dostęp administratora
                    </p>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    Konto administratora ma dostęp do treści Premium
                    niezależnie od płatnego pakietu.
                  </p>
                </>
              ) : isPremiumLoading ? (
                <p className="mt-4 text-zinc-400">
                  Sprawdzanie statusu dostępu...
                </p>
              ) : premiumError ? (
                <>
                  <p className="mt-4 font-semibold text-red-300">
                    Nie udało się pobrać statusu Premium
                  </p>

                  <p className="mt-2 text-sm text-zinc-400">
                    Nie rozpoczynamy płatności, dopóki nie potwierdzimy
                    aktualnego stanu konta.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      void loadPremiumStatus()
                    }
                    className="mt-5 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900"
                  >
                    Spróbuj ponownie
                  </button>
                </>
              ) : premiumStatus?.active ? (
                <>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

                    <p className="font-semibold text-emerald-300">
                      Premium aktywne
                    </p>
                  </div>

                  <p className="mt-3 text-zinc-300">
                    Masz pełny dostęp do materiałów Premium
                    {formattedAccessUntil
                      ? ` do ${formattedAccessUntil}.`
                      : "."}
                  </p>

                  <p className="mt-3 text-sm leading-6 text-zinc-500">
                    Kolejny zakup przedłuży aktualny dostęp o następne
                    30 dni.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-4 text-xl font-semibold text-zinc-100">
                    Odblokuj wszystkie materiały
                  </p>

                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    Uzyskaj dostęp do filmów, materiałów do pobrania,
                    zadań, odpowiedzi oraz pełnych rozwiązań.
                  </p>
                </>
              )}
            </div>

            {!isAdmin &&
              !isPremiumLoading &&
              !premiumError && (
                <div className="w-full shrink-0 md:w-64">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5">
                    <p className="text-3xl font-bold text-zinc-100">
                      49,99 zł
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      30 dni dostępu
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        void handleCheckout()
                      }
                      disabled={
                        isCheckoutBlocked
                      }
                      className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCheckoutLoading
                        ? "Przekierowywanie..."
                        : checkoutCooldownSeconds >
                            0
                          ? `Spróbuj ponownie za ${checkoutCooldownSeconds} s`
                          : premiumStatus?.active
                            ? "Przedłuż o 30 dni"
                            : "Kup 30 dni dostępu"}
                    </button>

                    <p className="mt-3 text-xs leading-5 text-zinc-500">
                      Jednorazowa płatność. Dostęp nie odnawia się
                      automatycznie.
                    </p>
                  </div>

                  {checkoutError && (
                    <p className="mt-3 text-sm text-red-300">
                      {checkoutError}
                    </p>
                  )}
                </div>
              )}
          </div>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Panel administratora
          </Link>
        )}

        <button
          type="button"
          onClick={() =>
            void handleLogout()
          }
          disabled={
            isLoggingOut
          }
          className="rounded-xl border border-red-500/40 px-5 py-3 font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoggingOut
            ? "Wylogowywanie..."
            : "Wyloguj"}
        </button>
      </div>
    </main>
  );
}