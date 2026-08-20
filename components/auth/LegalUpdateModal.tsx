"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import type {
  LegalUpdateRequirement,
} from "@/lib/legal-acceptance";

type LegalUpdateModalProps = {
  requirement: Exclude<
    LegalUpdateRequirement,
    "none"
  >;
  isSubmitting: boolean;
  error?: string;
  onAccept: () => Promise<void>;
  onLogout: () => Promise<void>;
};

export default function LegalUpdateModal({
  requirement,
  isSubmitting,
  error = "",
  onAccept,
  onLogout,
}: LegalUpdateModalProps) {
  const [isAccepted, setIsAccepted] =
    useState(false);

  useEffect(() => {
    setIsAccepted(false);
  }, [requirement]);

  const content =
    getModalContent(requirement);

  async function handleAccept() {
    if (
      !isAccepted ||
      isSubmitting
    ) {
      return;
    }

    await onAccept();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-update-title"
        aria-describedby="legal-update-description"
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl sm:p-8"
      >
        <div className="mb-6">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-400">
            Aktualizacja dokumentów
          </p>

          <h2
            id="legal-update-title"
            className="text-2xl font-bold tracking-tight text-zinc-100"
          >
            {content.title}
          </h2>

          <p
            id="legal-update-description"
            className="mt-3 text-sm leading-6 text-zinc-400"
          >
            {content.description}
          </p>
        </div>

        <div className="space-y-3">
          {content.showTerms && (
            <Link
              href="/termsAndConditions"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-900"
            >
              <span>
                Otwórz Regulamin
              </span>

              <span
                aria-hidden="true"
                className="text-zinc-500"
              >
                ↗
              </span>
            </Link>
          )}

          {content.showPrivacy && (
            <Link
              href="/privacyPolicy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-900"
            >
              <span>
                Otwórz Politykę prywatności
              </span>

              <span
                aria-hidden="true"
                className="text-zinc-500"
              >
                ↗
              </span>
            </Link>
          )}
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <input
            type="checkbox"
            checked={isAccepted}
            onChange={(event) =>
              setIsAccepted(
                event.target.checked,
              )
            }
            disabled={isSubmitting}
            className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
          />

          <span className="text-sm leading-6 text-zinc-300">
            {content.checkboxLabel}
          </span>
        </label>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            void handleAccept()
          }
          disabled={
            !isAccepted ||
            isSubmitting
          }
          className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Zapisywanie..."
            : content.buttonLabel}
        </button>

        <button
          type="button"
          onClick={() =>
            void onLogout()
          }
          disabled={isSubmitting}
          className="mt-3 w-full px-4 py-2 text-sm font-semibold text-zinc-500 transition hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Wyloguj się
        </button>
      </div>
    </div>
  );
}

type ModalContent = {
  title: string;
  description: string;
  checkboxLabel: string;
  buttonLabel: string;
  showTerms: boolean;
  showPrivacy: boolean;
};

function getModalContent(
  requirement: Exclude<
    LegalUpdateRequirement,
    "none"
  >,
): ModalContent {
  switch (requirement) {
    case "terms":
      return {
        title:
          "Zaktualizowaliśmy Regulamin",
        description:
          "Pojawiła się nowa wersja Regulaminu platformy. Przed dalszym korzystaniem z serwisu zapoznaj się z jego aktualną treścią.",
        checkboxLabel:
          "Akceptuję aktualny Regulamin.",
        buttonLabel:
          "Akceptuję i kontynuuję",
        showTerms: true,
        showPrivacy: false,
      };

    case "privacy":
      return {
        title:
          "Zaktualizowaliśmy Politykę prywatności",
        description:
          "Pojawiła się nowa wersja Polityki prywatności. Przed dalszym korzystaniem z serwisu zapoznaj się z jej aktualną treścią.",
        checkboxLabel:
          "Potwierdzam zapoznanie się z aktualną Polityką prywatności.",
        buttonLabel:
          "Potwierdzam i kontynuuję",
        showTerms: false,
        showPrivacy: true,
      };

    case "both":
      return {
        title:
          "Zaktualizowaliśmy dokumenty",
        description:
          "Pojawiły się nowe wersje Regulaminu oraz Polityki prywatności. Przed dalszym korzystaniem z serwisu zapoznaj się z aktualnymi dokumentami.",
        checkboxLabel:
          "Akceptuję aktualny Regulamin i potwierdzam zapoznanie się z aktualną Polityką prywatności.",
        buttonLabel:
          "Akceptuję i kontynuuję",
        showTerms: true,
        showPrivacy: true,
      };
  }
}