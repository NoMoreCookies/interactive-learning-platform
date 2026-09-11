"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  confirmSignUp,
  resendSignUpCode,
} from "aws-amplify/auth";

import {
  Button,
  StatusMessage,
} from "@/components/ui";

import VerificationCodeInput from "./VerificationCodeInput";

const RESEND_COOLDOWN_SECONDS =
  30;

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
  const [
    code,
    setCode,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    isResending,
    setIsResending,
  ] = useState(false);

  const [
    resendRetryAt,
    setResendRetryAt,
  ] = useState<
    number | null
  >(null);

  const [
    resendCooldownSeconds,
    setResendCooldownSeconds,
  ] = useState(0);

  const redirectTimeoutRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  useEffect(() => {
    return () => {
      if (
        redirectTimeoutRef.current
      ) {
        clearTimeout(
          redirectTimeoutRef.current,
        );
      }
    };
  }, []);

  useEffect(() => {
    if (
      resendRetryAt === null
    ) {
      setResendCooldownSeconds(
        0,
      );

      return;
    }

    const retryAt =
      resendRetryAt;

    function updateCooldown() {
      const remainingSeconds =
        Math.max(
          0,

          Math.ceil(
            (
              retryAt -
              Date.now()
            ) / 1000,
          ),
        );

      setResendCooldownSeconds(
        remainingSeconds,
      );

      if (
        remainingSeconds ===
        0
      ) {
        setResendRetryAt(
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
    resendRetryAt,
  ]);

  function startResendCooldown() {
    const retryAt =
      Date.now() +
      RESEND_COOLDOWN_SECONDS *
        1000;

    setResendRetryAt(
      retryAt,
    );

    setResendCooldownSeconds(
      RESEND_COOLDOWN_SECONDS,
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (
      code.length !== 6
    ) {
      setError(
        "Wpisz pełny 6-cyfrowy kod.",
      );

      return;
    }

    setIsLoading(true);

    try {
      const result =
        await confirmSignUp({
          username:
            email,

          confirmationCode:
            code,
        });

      if (
        !result.isSignUpComplete
      ) {
        setError(
          "Potwierdzenie konta wymaga dodatkowego kroku.",
        );

        return;
      }

      setMessage(
        "Konto zostało aktywowane.",
      );

      redirectTimeoutRef.current =
        setTimeout(
          onConfirmed,
          1200,
        );
    } catch (
      caughtError
    ) {
      setError(
        getConfirmationErrorMessage(
          caughtError,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendCode() {
    if (
      isResending ||
      resendCooldownSeconds >
        0
    ) {
      return;
    }

    setError("");
    setMessage("");
    setIsResending(true);

    try {
      await resendSignUpCode({
        username:
          email,
      });

      startResendCooldown();

      setMessage(
        "Jeżeli konto wymaga potwierdzenia, nowy kod został wysłany na podany adres e-mail.",
      );
    } catch (
      caughtError
    ) {
      /*
       * Do not reveal whether an account exists.
       *
       * Treat UserNotFound as a generic successful-looking response
       * so the UI cannot be used for account enumeration.
       */
      if (
        isUserNotFoundError(
          caughtError,
        )
      ) {
        startResendCooldown();

        setMessage(
          "Jeżeli konto wymaga potwierdzenia, nowy kod został wysłany na podany adres e-mail.",
        );

        return;
      }

      setError(
        getResendErrorMessage(
          caughtError,
        ),
      );
    } finally {
      setIsResending(false);
    }
  }

  const interactionDisabled =
    isLoading ||
    isResending;

  const resendDisabled =
    interactionDisabled ||
    resendCooldownSeconds >
      0;

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        disabled={
          interactionDisabled
        }
        className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-zinc-100 disabled:opacity-50"
      >
        <span aria-hidden="true">
          ←
        </span>

        Powrót
      </button>

      <div className="mb-8">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
          <MailIcon />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
          Sprawdź swoją
          skrzynkę
        </h1>

        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Wysłaliśmy
          6-cyfrowy kod
          potwierdzający na
          adres:
        </p>

        <p className="mt-1 break-all font-semibold text-blue-400">
          {email}
        </p>
      </div>

      <form
        onSubmit={
          handleSubmit
        }
      >
        <label className="mb-3 block text-sm font-medium text-zinc-300">
          Kod potwierdzający
        </label>

        <VerificationCodeInput
          value={code}
          onChange={setCode}
          disabled={
            interactionDisabled
          }
        />

        {error && (
          <StatusMessage
            tone="error"
            className="mt-5"
          >
            {error}
          </StatusMessage>
        )}

        {message && (
          <StatusMessage
            tone="success"
            className="mt-5"
          >
            {message}
          </StatusMessage>
        )}

        <Button
          type="submit"
          fullWidth
          className="mt-6"
          disabled={
            interactionDisabled ||
            code.length !== 6
          }
        >
          {isLoading
            ? "Potwierdzanie..."
            : "Potwierdź konto"}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-zinc-400">
        Nie dostałeś kodu?{" "}

        <button
          type="button"
          onClick={() =>
            void handleResendCode()
          }
          disabled={
            resendDisabled
          }
          className="font-semibold text-blue-400 transition-colors hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isResending
            ? "Wysyłanie..."
            : resendCooldownSeconds >
                0
              ? `Wyślij ponownie za ${resendCooldownSeconds} s`
              : "Wyślij ponownie"}
        </button>
      </div>

      <button
        type="button"
        onClick={onBack}
        disabled={
          interactionDisabled
        }
        className="mt-6 w-full text-center text-sm font-semibold text-zinc-400 transition hover:text-zinc-100 disabled:opacity-50"
      >
        ← Zmień adres
        e-mail
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
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />

      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function isUserNotFoundError(
  error: unknown,
): boolean {
  return (
    error instanceof Error &&
    error.name ===
      "UserNotFoundException"
  );
}

function getConfirmationErrorMessage(
  error: unknown,
): string {
  if (
    !(error instanceof Error)
  ) {
    return "Nie udało się potwierdzić konta.";
  }

  switch (
    error.name
  ) {
    case "CodeMismatchException":
      return "Podany kod jest nieprawidłowy.";

    case "ExpiredCodeException":
      return "Kod wygasł. Wyślij nowy kod i spróbuj ponownie.";

    case "NotAuthorizedException":
      return "Konto zostało już potwierdzone lub operacja jest niedozwolona.";

    case "LimitExceededException":
    case "TooManyRequestsException":
      return "Wykonano zbyt wiele prób. Spróbuj ponownie później.";

    default:
      return "Nie udało się potwierdzić konta. Spróbuj ponownie.";
  }
}

function getResendErrorMessage(
  error: unknown,
): string {
  if (
    !(error instanceof Error)
  ) {
    return "Nie udało się ponownie wysłać kodu.";
  }

  switch (
    error.name
  ) {
    case "LimitExceededException":
    case "TooManyRequestsException":
      return "Kod był wysyłany zbyt wiele razy. Spróbuj ponownie później.";

    case "InvalidParameterException":
      return "Nie udało się ponownie wysłać kodu. Konto może nie wymagać potwierdzenia.";

    default:
      return "Nie udało się ponownie wysłać kodu. Spróbuj ponownie.";
  }
}