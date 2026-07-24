"use client";

import { FormEvent, useState } from "react";
import { signUp } from "aws-amplify/auth";

type RegisterFormProps = {
  onLoginClick: () => void;
  onConfirmationRequired: (email: string) => void;
};

export default function RegisterForm({
  onLoginClick,
  onConfirmationRequired,
}: RegisterFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatedPassword, setRepeatedPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatedPassword, setShowRepeatedPassword] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const passwordRequirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    specialCharacter: /[^A-Za-z0-9]/.test(password),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch =
    password.length > 0 && password === repeatedPassword;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!isPasswordValid) {
      setError("Hasło nie spełnia wszystkich wymagań.");
      return;
    }

    if (!passwordsMatch) {
      setError("Podane hasła nie są identyczne.");
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const result = await signUp({
        username: normalizedEmail,
        password,
        options: {
          userAttributes: {
            email: normalizedEmail,
          },
        },
      });

      if (result.nextStep.signUpStep === "CONFIRM_SIGN_UP") {
        onConfirmationRequired(normalizedEmail);
        return;
      }

      if (result.isSignUpComplete) {
        onLoginClick();
        return;
      }

      setError("Rejestracja wymaga wykonania dodatkowego kroku.");
    } catch (error) {
      setError(getRegisterErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Utwórz swoje konto
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Załóż konto i rozpocznij naukę na platformie.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="register-email"
            className="text-sm font-medium text-slate-300"
          >
            Adres e-mail
          </label>

          <input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Wpisz swój e-mail"
            required
            className={inputClassName}
          />
        </div>

        <div>
          <label
            htmlFor="register-password"
            className="text-sm font-medium text-slate-300"
          >
            Hasło
          </label>

          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Utwórz hasło"
              required
              className={`${inputClassName} pr-20`}
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 transition-colors hover:text-white"
              aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
            >
              {showPassword ? "Ukryj" : "Pokaż"}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="register-repeat-password"
            className="text-sm font-medium text-slate-300"
          >
            Powtórz hasło
          </label>

          <div className="relative">
            <input
              id="register-repeat-password"
              type={showRepeatedPassword ? "text" : "password"}
              autoComplete="new-password"
              value={repeatedPassword}
              onChange={(event) => setRepeatedPassword(event.target.value)}
              placeholder="Powtórz hasło"
              required
              className={`${inputClassName} pr-20`}
            />

            <button
              type="button"
              onClick={() =>
                setShowRepeatedPassword((current) => !current)
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 transition-colors hover:text-white"
              aria-label={
                showRepeatedPassword
                  ? "Ukryj powtórzone hasło"
                  : "Pokaż powtórzone hasło"
              }
            >
              {showRepeatedPassword ? "Ukryj" : "Pokaż"}
            </button>
          </div>

          {repeatedPassword && !passwordsMatch && (
            <p className="mt-2 text-xs text-red-300">
              Hasła nie są identyczne.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs sm:grid-cols-2">
          <PasswordRequirement
            fulfilled={passwordRequirements.length}
            label="Minimum 8 znaków"
          />

          <PasswordRequirement
            fulfilled={passwordRequirements.uppercase}
            label="Jedna wielka litera"
          />

          <PasswordRequirement
            fulfilled={passwordRequirements.number}
            label="Jedna cyfra"
          />

          <PasswordRequirement
            fulfilled={passwordRequirements.specialCharacter}
            label="Znak specjalny"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={primaryButtonClassName}
        >
          {isLoading ? "Tworzenie konta..." : "Załóż konto"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-slate-400">
        Masz już konto?{" "}
        <button
          type="button"
          onClick={onLoginClick}
          className="font-semibold text-blue-400 transition-colors hover:text-blue-300"
        >
          Zaloguj się
        </button>
      </p>
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
      className={`flex items-center gap-2 ${
        fulfilled ? "text-emerald-400" : "text-slate-500"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
          fulfilled
            ? "border-emerald-500 bg-emerald-500/10"
            : "border-slate-700"
        }`}
      >
        {fulfilled ? "✓" : ""}
      </span>

      <span>{label}</span>
    </div>
  );
}

function getRegisterErrorMessage(error: unknown): string {
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
      return error.message || "Nie udało się utworzyć konta.";
  }
}

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

const primaryButtonClassName =
  "w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";