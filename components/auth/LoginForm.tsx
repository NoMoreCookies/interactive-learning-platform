"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchAuthSession,
  signIn,
} from "aws-amplify/auth";
import { useAuth } from "@/components/auth/AuthProvider";

type LoginFormProps = {
  defaultEmail?: string;
  onRegisterClick: () => void;
};

export default function LoginForm({
  defaultEmail = "",
  onRegisterClick,
}: LoginFormProps) {
  const router = useRouter();
  const { refreshAuth } = useAuth();

  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);


  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const result = await signIn({
        username: email.trim().toLowerCase(),
        password,
      });

    if (result.isSignedIn) {
      await refreshAuth();

      const session = await fetchAuthSession();

      const rawGroups =
        session.tokens?.accessToken.payload[
          "cognito:groups"
        ];

      const groups = Array.isArray(rawGroups)
        ? rawGroups
        : [];

      const isAdmin =
        groups.includes("ADMIN");

      router.push(
        isAdmin ? "/admin" : "/account",
      );

      router.refresh();

      return;
}

      setError("Logowanie wymaga wykonania dodatkowego kroku.");
    } catch (error) {
      setError(getLoginErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Witaj ponownie! 👋
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Zaloguj się, aby kontynuować naukę.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="login-email"
            className="text-sm font-medium text-slate-300"
          >
            Adres e-mail
          </label>

          <input
            id="login-email"
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
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor="login-password"
              className="text-sm font-medium text-slate-300"
            >
              Hasło
            </label>

            <button
              type="button"
              className="text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300"
            >
              Nie pamiętasz hasła?
            </button>
          </div>

          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Wpisz swoje hasło"
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
          {isLoading ? "Logowanie..." : "Zaloguj się"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-slate-400">
        Nie masz jeszcze konta?{" "}
        <button
          type="button"
          onClick={onRegisterClick}
          className="font-semibold text-blue-400 transition-colors hover:text-blue-300"
        >
          Utwórz konto
        </button>
      </p>
    </div>
  );
}

function getLoginErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Nie udało się zalogować.";
  }

  switch (error.name) {
    case "UserNotFoundException":
    case "NotAuthorizedException":
      return "Nieprawidłowy adres e-mail lub hasło.";

    case "UserNotConfirmedException":
      return "Konto nie zostało jeszcze potwierdzone.";

    case "LimitExceededException":
      return "Wykonano zbyt wiele prób. Spróbuj ponownie później.";

    default:
      return error.message || "Nie udało się zalogować.";
  }
}

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

const primaryButtonClassName =
  "w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";