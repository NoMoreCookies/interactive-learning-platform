"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  confirmResetPassword,
  resetPassword,
} from "aws-amplify/auth";

import {
  Button,
  FormField,
  Input,
  StatusMessage,
} from "@/components/ui";

import VerificationCodeInput from "./VerificationCodeInput";

const RESEND_COOLDOWN_SECONDS =
  30;

type ResetPasswordFormProps = {
  defaultEmail?: string;
  onBack: () => void;

  onPasswordReset: (
    email: string,
  ) => void;
};

type ResetStep =
  | "request"
  | "confirm";

export default function ResetPasswordForm({
  defaultEmail = "",
  onBack,
  onPasswordReset,
}: ResetPasswordFormProps) {
  const [
    step,
    setStep,
  ] =
    useState<ResetStep>(
      "request",
    );

  const [
    email,
    setEmail,
  ] =
    useState(
      defaultEmail,
    );

  const [
    code,
    setCode,
  ] =
    useState("");

  const [
    newPassword,
    setNewPassword,
  ] =
    useState("");

  const [
    repeatedPassword,
    setRepeatedPassword,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);

  const [
    isResending,
    setIsResending,
  ] =
    useState(false);

  const [
    resendRetryAt,
    setResendRetryAt,
  ] =
    useState<
      number | null
    >(null);

  const [
    resendCooldownSeconds,
    setResendCooldownSeconds,
  ] =
    useState(0);

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

  async function handleRequestCode(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedEmail =
      normalizeEmail(
        email,
      );

    setError("");
    setMessage("");

    if (
      !normalizedEmail
    ) {
      setError(
        "Wpisz adres e-mail.",
      );

      return;
    }

    setIsLoading(true);

    try {
      const result =
        await resetPassword({
          username:
            normalizedEmail,
        });

      setEmail(
        normalizedEmail,
      );

      if (
        result
          .nextStep
          .resetPasswordStep ===
        "CONFIRM_RESET_PASSWORD_WITH_CODE"
      ) {
        startResendCooldown();

        setStep(
          "confirm",
        );

        setMessage(
          "Jeżeli konto z tym adresem istnieje, kod do zmiany hasła został wysłany.",
        );

        return;
      }

      if (
        result
          .nextStep
          .resetPasswordStep ===
        "DONE"
      ) {
        setMessage(
          "Hasło zostało zresetowane.",
        );

        redirectTimeoutRef.current =
          setTimeout(
            () =>
              onPasswordReset(
                normalizedEmail,
              ),
            1200,
          );
      }
    } catch (
      caughtError
    ) {
      /*
       * Do not reveal whether an account exists
       * for the provided email address.
       */
      if (
        isUserNotFoundError(
          caughtError,
        )
      ) {
        setEmail(
          normalizedEmail,
        );

        startResendCooldown();

        setStep(
          "confirm",
        );

        setMessage(
          "Jeżeli konto z tym adresem istnieje, kod do zmiany hasła został wysłany.",
        );

        return;
      }

      setError(
        getRequestErrorMessage(
          caughtError,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmReset(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedEmail =
      normalizeEmail(
        email,
      );

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

    if (
      newPassword !==
      repeatedPassword
    ) {
      setError(
        "Podane hasła nie są takie same.",
      );

      return;
    }

    if (
      !isPasswordValid(
        newPassword,
      )
    ) {
      setError(
        "Hasło musi mieć co najmniej 8 znaków oraz zawierać małą literę, wielką literę, cyfrę i znak specjalny.",
      );

      return;
    }

    setIsLoading(true);

    try {
      await confirmResetPassword({
        username:
          normalizedEmail,

        confirmationCode:
          code,

        newPassword,
      });

      setMessage(
        "Hasło zostało zmienione. Za chwilę wrócisz do logowania.",
      );

      redirectTimeoutRef.current =
        setTimeout(
          () =>
            onPasswordReset(
              normalizedEmail,
            ),
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

    const normalizedEmail =
      normalizeEmail(
        email,
      );

    setError("");
    setMessage("");
    setIsResending(true);

    try {
      const result =
        await resetPassword({
          username:
            normalizedEmail,
        });

      if (
        result
          .nextStep
          .resetPasswordStep ===
        "CONFIRM_RESET_PASSWORD_WITH_CODE"
      ) {
        setCode("");

        startResendCooldown();

        setMessage(
          "Jeżeli konto z tym adresem istnieje, nowy kod został wysłany.",
        );
      }
    } catch (
      caughtError
    ) {
      if (
        isUserNotFoundError(
          caughtError,
        )
      ) {
        startResendCooldown();

        setMessage(
          "Jeżeli konto z tym adresem istnieje, nowy kod został wysłany.",
        );

        return;
      }

      setError(
        getRequestErrorMessage(
          caughtError,
        ),
      );
    } finally {
      setIsResending(false);
    }
  }

  function handleChangeEmail() {
    setStep(
      "request",
    );

    setCode("");
    setNewPassword("");
    setRepeatedPassword("");
    setError("");
    setMessage("");

    setResendRetryAt(
      null,
    );

    setResendCooldownSeconds(
      0,
    );
  }

  const interactionDisabled =
    isLoading ||
    isResending;

  const resendDisabled =
    interactionDisabled ||
    resendCooldownSeconds >
      0;

  if (
    step === "request"
  ) {
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

          Powrót do logowania
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
            Zresetuj hasło
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Podaj adres e-mail
            przypisany do konta.
            Wyślemy Ci kod
            potrzebny do
            ustawienia nowego
            hasła.
          </p>
        </div>

        <form
          onSubmit={
            handleRequestCode
          }
          className="space-y-5"
        >
          <FormField
            htmlFor="reset-email"
            label="Adres e-mail"
          >
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(
                event,
              ) =>
                setEmail(
                  event
                    .target
                    .value,
                )
              }
              placeholder="Wpisz swój e-mail"
              required
              disabled={
                interactionDisabled
              }
            />
          </FormField>

          {error && (
            <StatusMessage tone="error">
              {error}
            </StatusMessage>
          )}

          {message && (
            <StatusMessage tone="success">
              {message}
            </StatusMessage>
          )}

          <Button
            type="submit"
            fullWidth
            disabled={
              interactionDisabled
            }
          >
            {isLoading
              ? "Wysyłanie..."
              : "Wyślij kod"}
          </Button>
        </form>
      </div>
    );
  }

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

        Powrót do logowania
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
          Ustaw nowe hasło
        </h1>

        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Jeżeli konto istnieje,
          kod został wysłany na
          adres:
        </p>

        <p className="mt-1 break-all font-semibold text-blue-400">
          {email}
        </p>
      </div>

      <form
        onSubmit={
          handleConfirmReset
        }
        className="space-y-5"
      >
        <div>
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
        </div>

        <FormField
          htmlFor="reset-new-password"
          label="Nowe hasło"
        >
          <div className="relative">
            <Input
              id="reset-new-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              autoComplete="new-password"
              value={
                newPassword
              }
              onChange={(
                event,
              ) =>
                setNewPassword(
                  event
                    .target
                    .value,
                )
              }
              placeholder="Wpisz nowe hasło"
              required
              disabled={
                interactionDisabled
              }
              className="pr-20"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (
                    current,
                  ) =>
                    !current,
                )
              }
              disabled={
                interactionDisabled
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-50"
              aria-label={
                showPassword
                  ? "Ukryj hasło"
                  : "Pokaż hasło"
              }
            >
              {showPassword
                ? "Ukryj"
                : "Pokaż"}
            </button>
          </div>
        </FormField>

        <FormField
          htmlFor="reset-repeat-password"
          label="Powtórz nowe hasło"
        >
          <Input
            id="reset-repeat-password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            autoComplete="new-password"
            value={
              repeatedPassword
            }
            onChange={(
              event,
            ) =>
              setRepeatedPassword(
                event
                  .target
                  .value,
              )
            }
            placeholder="Powtórz nowe hasło"
            required
            disabled={
              interactionDisabled
            }
          />
        </FormField>

        <p className="text-xs leading-5 text-zinc-500">
          Hasło musi mieć
          minimum 8 znaków oraz
          zawierać małą literę,
          wielką literę, cyfrę
          i znak specjalny.
        </p>

        {error && (
          <StatusMessage tone="error">
            {error}
          </StatusMessage>
        )}

        {message && (
          <StatusMessage tone="success">
            {message}
          </StatusMessage>
        )}

        <Button
          type="submit"
          fullWidth
          disabled={
            interactionDisabled ||
            code.length !== 6
          }
        >
          {isLoading
            ? "Zmienianie hasła..."
            : "Ustaw nowe hasło"}
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
        onClick={
          handleChangeEmail
        }
        disabled={
          interactionDisabled
        }
        className="mt-6 w-full text-center text-sm font-semibold text-zinc-400 transition hover:text-zinc-100 disabled:opacity-50"
      >
        ← Zmień adres e-mail
      </button>
    </div>
  );
}

function normalizeEmail(
  email: string,
): string {
  return email
    .trim()
    .toLowerCase();
}

function isPasswordValid(
  password: string,
): boolean {
  return (
    password.length >= 8 &&
    /[a-z]/.test(
      password,
    ) &&
    /[A-Z]/.test(
      password,
    ) &&
    /\d/.test(
      password,
    ) &&
    /[^A-Za-z0-9]/.test(
      password,
    )
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

function getRequestErrorMessage(
  error: unknown,
): string {
  if (
    !(error instanceof Error)
  ) {
    return "Nie udało się wysłać kodu.";
  }

  switch (
    error.name
  ) {
    case "LimitExceededException":
    case "TooManyRequestsException":
      return "Wykonano zbyt wiele prób. Spróbuj ponownie później.";

    case "CodeDeliveryFailureException":
      return "Nie udało się dostarczyć kodu. Spróbuj ponownie później.";

    case "InvalidParameterException":
      return "Nie można teraz wykonać tej operacji.";

    default:
      return "Nie udało się wysłać kodu. Spróbuj ponownie.";
  }
}

function getConfirmationErrorMessage(
  error: unknown,
): string {
  if (
    !(error instanceof Error)
  ) {
    return "Nie udało się zmienić hasła.";
  }

  switch (
    error.name
  ) {
    case "CodeMismatchException":
      return "Podany kod jest nieprawidłowy.";

    case "ExpiredCodeException":
      return "Kod wygasł. Wyślij nowy kod i spróbuj ponownie.";

    case "InvalidPasswordException":
      return "Nowe hasło nie spełnia wymagań bezpieczeństwa.";

    case "LimitExceededException":
    case "TooManyRequestsException":
      return "Wykonano zbyt wiele prób. Spróbuj ponownie później.";

    case "UserNotFoundException":
      return "Nie udało się zmienić hasła dla tego konta.";

    default:
      return "Nie udało się zmienić hasła. Spróbuj ponownie.";
  }
}