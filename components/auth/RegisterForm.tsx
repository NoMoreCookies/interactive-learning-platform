"use client";

import {
  type FormEvent,
  useMemo,
  useState,
} from "react";

import { signUp } from "aws-amplify/auth";

import {
  Button,
  FormField,
  Input,
  StatusMessage,
} from "@/components/ui";

type RegisterFormProps = {
  onLoginClick: () => void;
  onConfirmationRequired: (
    email: string,
  ) => void;
};

type PasswordRequirements = {
  length: boolean;
  uppercase: boolean;
  number: boolean;
  specialCharacter: boolean;
};

export default function RegisterForm({
  onLoginClick,
  onConfirmationRequired,
}: RegisterFormProps) {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    repeatedPassword,
    setRepeatedPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showRepeatedPassword,
    setShowRepeatedPassword,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const passwordRequirements =
    useMemo<PasswordRequirements>(
      () => ({
        length: password.length >= 8,
        uppercase:
          /[A-Z]/.test(password),
        number: /\d/.test(password),
        specialCharacter:
          /[^A-Za-z0-9]/.test(
            password,
          ),
      }),
      [password],
    );

  const isPasswordValid =
    Object.values(
      passwordRequirements,
    ).every(Boolean);

  const passwordsMatch =
    password.length > 0 &&
    password === repeatedPassword;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!isPasswordValid) {
      setError(
        "Hasło nie spełnia wszystkich wymagań.",
      );
      return;
    }

    if (!passwordsMatch) {
      setError(
        "Podane hasła nie są identyczne.",
      );
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail =
        email.trim().toLowerCase();

      const result = await signUp({
        username: normalizedEmail,
        password,
        options: {
          userAttributes: {
            email: normalizedEmail,
          },
        },
      });

      if (
        result.nextStep.signUpStep ===
        "CONFIRM_SIGN_UP"
      ) {
        onConfirmationRequired(
          normalizedEmail,
        );
        return;
      }

      if (result.isSignUpComplete) {
        onLoginClick();
        return;
      }

      setError(
        "Rejestracja wymaga wykonania dodatkowego kroku.",
      );
    } catch (caughtError) {
      setError(
        getRegisterErrorMessage(
          caughtError,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
          Utwórz swoje konto
        </h1>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Załóż konto i rozpocznij naukę
          na platformie.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <FormField
          htmlFor="register-email"
          label="Adres e-mail"
        >
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="Wpisz swój e-mail"
            required
            disabled={isLoading}
          />
        </FormField>

        <FormField
          htmlFor="register-password"
          label="Hasło"
        >
          <PasswordInput
            id="register-password"
            value={password}
            visible={showPassword}
            onValueChange={setPassword}
            onVisibilityChange={() =>
              setShowPassword(
                (current) => !current,
              )
            }
            disabled={isLoading}
            placeholder="Utwórz hasło"
          />
        </FormField>

        <FormField
          htmlFor="register-repeat-password"
          label="Powtórz hasło"
          error={
            repeatedPassword &&
            !passwordsMatch
              ? "Hasła nie są identyczne."
              : undefined
          }
        >
          <PasswordInput
            id="register-repeat-password"
            value={repeatedPassword}
            visible={
              showRepeatedPassword
            }
            onValueChange={
              setRepeatedPassword
            }
            onVisibilityChange={() =>
              setShowRepeatedPassword(
                (current) => !current,
              )
            }
            disabled={isLoading}
            placeholder="Powtórz hasło"
            aria-invalid={
              Boolean(
                repeatedPassword &&
                  !passwordsMatch,
              )
            }
            aria-describedby={
              repeatedPassword &&
              !passwordsMatch
                ? "register-repeat-password-error"
                : undefined
            }
          />
        </FormField>

        <div className="grid grid-cols-1 gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-xs sm:grid-cols-2">
          <PasswordRequirement
            fulfilled={
              passwordRequirements.length
            }
            label="Minimum 8 znaków"
          />

          <PasswordRequirement
            fulfilled={
              passwordRequirements.uppercase
            }
            label="Jedna wielka litera"
          />

          <PasswordRequirement
            fulfilled={
              passwordRequirements.number
            }
            label="Jedna cyfra"
          />

          <PasswordRequirement
            fulfilled={
              passwordRequirements.specialCharacter
            }
            label="Znak specjalny"
          />
        </div>

        {error && (
          <StatusMessage tone="error">
            {error}
          </StatusMessage>
        )}

        <Button
          type="submit"
          fullWidth
          disabled={isLoading}
        >
          {isLoading
            ? "Tworzenie konta..."
            : "Załóż konto"}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-zinc-400">
        Masz już konto?{" "}
        <button
          type="button"
          onClick={onLoginClick}
          disabled={isLoading}
          className="font-semibold text-blue-400 transition-colors hover:text-blue-300 disabled:opacity-50"
        >
          Zaloguj się
        </button>
      </p>
    </div>
  );
}

type PasswordInputProps = {
  id: string;
  value: string;
  visible: boolean;
  placeholder: string;
  disabled: boolean;
  onValueChange: (
    value: string,
  ) => void;
  onVisibilityChange: () => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

function PasswordInput({
  id,
  value,
  visible,
  placeholder,
  disabled,
  onValueChange,
  onVisibilityChange,
  ...ariaProps
}: PasswordInputProps) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={
          visible ? "text" : "password"
        }
        autoComplete="new-password"
        value={value}
        onChange={(event) =>
          onValueChange(
            event.target.value,
          )
        }
        placeholder={placeholder}
        required
        disabled={disabled}
        className="pr-20"
        {...ariaProps}
      />

      <button
        type="button"
        onClick={onVisibilityChange}
        disabled={disabled}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-50"
        aria-label={
          visible
            ? "Ukryj hasło"
            : "Pokaż hasło"
        }
      >
        {visible ? "Ukryj" : "Pokaż"}
      </button>
    </div>
  );
}

function PasswordRequirement({
  fulfilled,
  label,
}: {
  fulfilled: boolean;
  label: string;
}) {
  return (
    <div
      className={[
        "flex items-center gap-2",
        fulfilled
          ? "text-emerald-400"
          : "text-zinc-500",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "flex h-4 w-4 items-center justify-center rounded-full border text-[10px]",
          fulfilled
            ? "border-emerald-500 bg-emerald-500/10"
            : "border-zinc-700",
        ].join(" ")}
      >
        {fulfilled ? "✓" : ""}
      </span>

      <span>{label}</span>
    </div>
  );
}

function getRegisterErrorMessage(
  error: unknown,
): string {
  if (!(error instanceof Error)) {
    return "Nie udało się utworzyć konta.";
  }

  switch (error.name) {
    case "UsernameExistsException":
      return "Konto z tym adresem e-mail już istnieje.";

    case "InvalidPasswordException":
      return "Hasło nie spełnia wymagań bezpieczeństwa.";

    case "InvalidParameterException":
      return "Podane dane są nieprawidłowe.";

    case "LimitExceededException":
      return "Wykonano zbyt wiele prób. Spróbuj ponownie później.";

    default:
      return "Nie udało się utworzyć konta. Spróbuj ponownie.";
  }
}
