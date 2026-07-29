"use client";

import {
  type FormEvent,
  useState,
} from "react";

import {
  fetchAuthSession,
  signIn,
} from "aws-amplify/auth";

import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  Button,
  FormField,
  Input,
  StatusMessage,
} from "@/components/ui";

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

  const [email, setEmail] =
    useState(defaultEmail);

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const result = await signIn({
        username:
          email.trim().toLowerCase(),
        password,
      });

      if (!result.isSignedIn) {
        setError(
          "Logowanie wymaga wykonania dodatkowego kroku.",
        );
        return;
      }

      await refreshAuth();

      const session =
        await fetchAuthSession();

      const rawGroups =
        session.tokens?.accessToken.payload[
          "cognito:groups"
        ];

      const groups = Array.isArray(
        rawGroups,
      )
        ? rawGroups.filter(
            (
              group,
            ): group is string =>
              typeof group === "string",
          )
        : [];

      router.push(
        groups.includes("ADMIN")
          ? "/admin"
          : "/account",
      );

      router.refresh();
    } catch (caughtError) {
      setError(
        getLoginErrorMessage(
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
          Witaj ponownie
        </h1>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Zaloguj się, aby kontynuować
          naukę.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <FormField
          htmlFor="login-email"
          label="Adres e-mail"
        >
          <Input
            id="login-email"
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
          htmlFor="login-password"
          label="Hasło"
        >
          <div className="relative">
            <Input
              id="login-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder="Wpisz swoje hasło"
              required
              disabled={isLoading}
              className="pr-20"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (current) => !current,
                )
              }
              disabled={isLoading}
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
            ? "Logowanie..."
            : "Zaloguj się"}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-zinc-400">
        Nie masz jeszcze konta?{" "}
        <button
          type="button"
          onClick={onRegisterClick}
          disabled={isLoading}
          className="font-semibold text-blue-400 transition-colors hover:text-blue-300 disabled:opacity-50"
        >
          Utwórz konto
        </button>
      </p>
    </div>
  );
}

function getLoginErrorMessage(
  error: unknown,
): string {
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
      return "Nie udało się zalogować. Spróbuj ponownie.";
  }
}
