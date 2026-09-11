"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import {
  getMyCheckoutResult,
} from "@/lib/services/billing-service";

type CheckoutSuccessClientProps = {
  sessionId: string | null;
};

type PageStatus =
  | "PROCESSING"
  | "COMPLETED"
  | "DELAYED"
  | "ERROR";

function formatDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "pl-PL",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(
    new Date(value),
  );
}

function wait(
  milliseconds: number,
): Promise<void> {
  return new Promise(
    (resolve) => {
      window.setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

export function CheckoutSuccessClient({
  sessionId,
}: CheckoutSuccessClientProps) {
  const [
    status,
    setStatus,
  ] =
    useState<PageStatus>(
      "PROCESSING",
    );

  const [
    accessUntil,
    setAccessUntil,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    if (!sessionId) {
      setStatus(
        "ERROR",
      );

      return;
    }

    let cancelled =
      false;

    async function verifyPurchase() {
      try {
        /*
         * Stripe redirect and webhook delivery are independent.
         *
         * Give the webhook a short window to create the trusted
         * BillingPurchase record.
         */
        for (
          let attempt = 0;
          attempt < 12;
          attempt += 1
        ) {
          const result =
            await getMyCheckoutResult(
              sessionId as string,
            );

          if (cancelled) {
            return;
          }

          if (
            result.status ===
            "COMPLETED"
          ) {
            setAccessUntil(
              result.accessUntil,
            );

            setStatus(
              "COMPLETED",
            );

            return;
          }

          await wait(
            1500,
          );
        }

        if (!cancelled) {
          setStatus(
            "DELAYED",
          );
        }
      } catch {
        if (!cancelled) {
          setStatus(
            "ERROR",
          );
        }
      }
    }

    void verifyPurchase();

    return () => {
      cancelled = true;
    };
  }, [
    sessionId,
  ]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-6 py-16">
      <section className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-8 md:p-10">
        {status ===
          "PROCESSING" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
              Finalizacja płatności
            </p>

            <h1 className="mt-4 text-3xl font-bold text-zinc-100">
              Aktywujemy Twój dostęp Premium
            </h1>

            <p className="mt-4 leading-7 text-zinc-400">
              Płatność została zakończona w Stripe.
              Czekamy jeszcze na bezpieczne potwierdzenie
              płatności przez nasz backend.
            </p>

            <div className="mt-8 flex items-center gap-3 text-zinc-400">
              <span className="h-3 w-3 animate-pulse rounded-full bg-blue-400" />

              Weryfikowanie płatności...
            </div>
          </>
        )}

        {status ===
          "COMPLETED" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Płatność potwierdzona
            </p>

            <h1 className="mt-4 text-3xl font-bold text-zinc-100">
              Premium jest aktywne
            </h1>

            <p className="mt-4 leading-7 text-zinc-400">
              Twój zakup został poprawnie przetworzony.
              {accessUntil
                ? ` Dostęp Premium jest aktywny do ${formatDate(
                    accessUntil,
                  )}.`
                : ""}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/courses"
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Przejdź do kursów
              </Link>

              <Link
                href="/account"
                className="rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-zinc-200 transition hover:bg-zinc-900"
              >
                Moje konto
              </Link>
            </div>
          </>
        )}

        {status ===
          "DELAYED" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-yellow-300">
              Płatność jest przetwarzana
            </p>

            <h1 className="mt-4 text-3xl font-bold text-zinc-100">
              Potwierdzenie trwa dłużej niż zwykle
            </h1>

            <p className="mt-4 leading-7 text-zinc-400">
              Nie wykonuj kolejnej płatności. Stripe może
              potrzebować jeszcze chwili na dostarczenie
              potwierdzenia.
            </p>

            <Link
              href="/account"
              className="mt-8 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Przejdź do konta
            </Link>
          </>
        )}

        {status ===
          "ERROR" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-300">
              Nie udało się sprawdzić statusu
            </p>

            <h1 className="mt-4 text-3xl font-bold text-zinc-100">
              Sprawdź swoje konto
            </h1>

            <p className="mt-4 leading-7 text-zinc-400">
              Nie udało się teraz potwierdzić wyniku tej
              płatności. Nie wykonuj ponownej płatności bez
              wcześniejszego sprawdzenia statusu Premium.
            </p>

            <Link
              href="/account"
              className="mt-8 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Moje konto
            </Link>
          </>
        )}
      </section>
    </main>
  );
}