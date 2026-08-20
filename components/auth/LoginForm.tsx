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
import LegalUpdateModal from "@/components/auth/LegalUpdateModal";
import {
  Button,
  FormField,
  Input,
  StatusMessage,
} from "@/components/ui";

import {
  acceptCurrentLegal,
  getLegalUpdateRequirement,
  type LegalUpdateRequirement,
} from "@/lib/legal-acceptance";

type LoginFormProps = {
  defaultEmail?: string;
  onRegisterClick: () => void;
  onConfirmRequired: (
    email: string,
  ) => void;
  onForgotPasswordClick: (
    email: string,
  ) => void;
};

type RequiredLegalUpdate = Exclude<
  LegalUpdateRequirement,
  "none"
>;

export default function LoginForm({
  defaultEmail = "",
  onRegisterClick,
  onConfirmRequired,
  onForgotPasswordClick,
}: LoginFormProps) {
  const router = useRouter();

  const {
    refreshAuth,
    logout,
  } = useAuth();

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

  const [
    legalRequirement,
    setLegalRequirement,
  ] =
    useState<RequiredLegalUpdate | null>(
      null,
    );

  const [
    destinationAfterLogin,
    setDestinationAfterLogin,
  ] = useState<
    "/account" | "/admin" | null
  >(null);

  const [
    isAcceptingLegal,
    setIsAcceptingLegal,
  ] = useState(false);

  const [
    legalError,
    setLegalError,
  ] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedEmail =
      normalizeEmail(email);

    setError("");
    setLegalError("");
    setIsLoading(true);

    try {
      const result = await signIn({
        username: normalizedEmail,
        password,
      });

      if (
        result.nextStep.signInStep ===
        "CONFIRM_SIGN_UP"
      ) {
        setPassword("");

        onConfirmRequired(
          normalizedEmail,
        );

        return;
      }

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

      const destination:
        | "/admin"
        | "/account" =
        groups.includes("ADMIN")
          ? "/admin"
          : "/account";

      let requirement:
        LegalUpdateRequirement;

      try {
        requirement =
          await getLegalUpdateRequirement();
      } catch {
        await logout();

        setError(
          "Nie udało się sprawdzić aktualności dokumentów. Spróbuj zalogować się ponownie.",
        );

        return;
      }

      if (requirement !== "none") {
        setPassword("");

        setDestinationAfterLogin(
          destination,
        );

        setLegalRequirement(
          requirement,
        );

        return;
      }

      navigateAfterLogin(
        destination,
      );
    } catch (caughtError) {
      if (
        isUserNotConfirmedError(
          caughtError,
        )
      ) {
        setPassword("");

        onConfirmRequired(
          normalizedEmail,
        );

        return;
      }

      setError(
        getLoginErrorMessage(
          caughtError,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLegalAccept() {
    if (
      !legalRequirement ||
      !destinationAfterLogin
    ) {
      return;
    }

    setLegalError("");
    setIsAcceptingLegal(true);

    try {
      await acceptCurrentLegal();

      const requirementAfterAcceptance =
        await getLegalUpdateRequirement();

      if (
        requirementAfterAcceptance !==
        "none"
      ) {
        throw new Error(
          "Akceptacja nie została prawidłowo zapisana.",
        );
      }

      const destination =
        destinationAfterLogin;

      setLegalRequirement(null);
      setDestinationAfterLogin(null);

      navigateAfterLogin(destination);
    } catch (caughtError) {
      console.error(
        "Failed to accept legal documents:",
        caughtError,
      );

      setLegalError(
        "Nie udało się zapisać akceptacji dokumentów. Spróbuj ponownie.",
      );
    } finally {
      setIsAcceptingLegal(false);
    }
  }

  async function handleLegalLogout() {
    setLegalError("");
    setIsAcceptingLegal(true);

    try {
      await logout();

      setLegalRequirement(null);
      setDestinationAfterLogin(null);
      setPassword("");

      router.refresh();
    } finally {
      setIsAcceptingLegal(false);
    }
  }

  function navigateAfterLogin(
    destination:
      | "/admin"
      | "/account",
  ) {
    router.push(destination);
    router.refresh();
  }

  function handleForgotPassword() {
    setError("");

    onForgotPasswordClick(
      normalizeEmail(email),
    );
  }

  return (
    <>
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
                setEmail(
                  event.target.value,
                )
              }
              placeholder="Wpisz swój e-mail"
              required
              disabled={isLoading}
            />
          </FormField>

          <div>
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
                      (current) =>
                        !current,
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

            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={
                  handleForgotPassword
                }
                disabled={isLoading}
                className="text-sm font-semibold text-blue-400 transition-colors hover:text-blue-300 disabled:opacity-50"
              >
                Nie pamiętasz hasła?
              </button>
            </div>
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

      {legalRequirement && (
        <LegalUpdateModal
          requirement={
            legalRequirement
          }
          isSubmitting={
            isAcceptingLegal
          }
          error={legalError}
          onAccept={
            handleLegalAccept
          }
          onLogout={
            handleLegalLogout
          }
        />
      )}
    </>
  );
}

function normalizeEmail(
  email: string,
): string {
  return email.trim().toLowerCase();
}

function isUserNotConfirmedError(
  error: unknown,
): boolean {
  return (
    error instanceof Error &&
    error.name ===
      "UserNotConfirmedException"
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

    case "LimitExceededException":
    case "TooManyRequestsException":
      return "Wykonano zbyt wiele prób. Spróbuj ponownie później.";

    default:
      return "Nie udało się zalogować. Spróbuj ponownie.";
  }
}