"use client";

import { FormEvent, useState } from "react";
import {
  confirmSignUp,
  resendSignUpCode,
} from "aws-amplify/auth";

import VerificationCodeInput from "./VerificationCodeInput";

type ConfirmSignUpFormProps = {
  email: string;
  onBack: () => void;
  onConfirmed: () => void;
};

export default function ConfirmSignUpForm({
  email,
  onBack,
  onConfirmed,
}: ConfirmSignUpFormProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (code.length !== 6) {
      setError("Wpisz pełny 6-cyfrowy kod.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await confirmSignUp({
        username: email,
        confirmationCode: code,
      });

      if (result.isSignUpComplete) {
        setMessage("Konto zostało aktywowane.");

        window.setTimeout(() => {
          onConfirmed();
        }, 1200);

        return;
      }

      setError("Potwierdzenie konta wymaga dodatkowego kroku.");
    } catch (error) {
      setError(getConfirmationErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendCode() {
    setError("");
    setMessage("");
    setIsResending(true);

    try {
      await resendSignUpCode({
        username: email,
      });

      setMessage("Nowy kod został wysłany na podany adres e-mail.");
    } catch (error) {
      setError(getResendErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
      >
        <span aria-hidden="true">←</span>
        Powrót
      </button>

      <div className="mb-8">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
          <MailIcon />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white">
          Sprawdź swoją skrzynkę
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Wysłaliśmy 6-cyfrowy kod potwierdzający na adres:
        </p>

        <p className="mt-1 break-all font-semibold text-blue-400">
          {email}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <label className="mb-3 block text-sm font-medium text-slate-300">
          Kod potwierdzający
        </label>

        <VerificationCodeInput
          value={code}
          onChange={setCode}
          disabled={isLoading}
        />

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || code.length !== 6}
          className={`${primaryButtonClassName} mt-6`}
        >
          {isLoading ? "Potwierdzanie..." : "Potwierdź konto"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-400">
        Nie dostałeś kodu?{" "}
        <button
          type="button"
          onClick={handleResendCode}
          disabled={isResending}
          className="font-semibold text-blue-400 transition-colors hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isResending ? "Wysyłanie..." : "Wyślij ponownie"}
        </button>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-6 w-full text-center text-sm font-semibold text-slate-400 transition hover:text-white"
      >
        ← Zmień adres e-mail
      </button>
    </div>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function getConfirmationErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Nie udało się potwierdzić konta.";
  }

  switch (error.name) {
    case "CodeMismatchException":
      return "Podany kod jest nieprawidłowy.";

    case "ExpiredCodeException":
      return "Kod wygasł. Wyślij nowy kod i spróbuj ponownie.";

    case "NotAuthorizedException":
      return "Konto zostało już potwierdzone lub operacja jest niedozwolona.";

    case "LimitExceededException":
      return "Wykonano zbyt wiele prób. Spróbuj ponownie później.";

    default:
      return error.message || "Nie udało się potwierdzić konta.";
  }
}

function getResendErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Nie udało się ponownie wysłać kodu.";
  }

  switch (error.name) {
    case "LimitExceededException":
      return "Kod był wysyłany zbyt wiele razy. Spróbuj ponownie później.";

    case "UserNotFoundException":
      return "Nie znaleziono konta z tym adresem e-mail.";

    case "InvalidParameterException":
      return "Konto może być już potwierdzone.";

    default:
      return error.message || "Nie udało się ponownie wysłać kodu.";
  }
}

const primaryButtonClassName =
  "w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";