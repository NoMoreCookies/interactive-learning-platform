"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  fetchMFAPreference,
  setUpTOTP,
  signOut,
  updateMFAPreference,
  verifyTOTPSetup,
} from "aws-amplify/auth";

import {
  useRouter,
} from "next/navigation";

import {
  QRCodeSVG,
} from "qrcode.react";

import {
  useAuth,
} from "@/components/auth/AuthProvider";

import VerificationCodeInput from "@/components/auth/VerificationCodeInput";

import {
  Button,
  StatusMessage,
  Surface,
} from "@/components/ui";

type MfaState =
  | "LOADING"
  | "DISABLED"
  | "ENABLED_NOT_PREFERRED"
  | "ACTIVE"
  | "ERROR";

const TOTP_ISSUER =
  "poprostumatma.pl";

export default function TotpSetupCard() {
  const router =
    useRouter();

  const {
    isAuthenticated,
    isLoading:
      isAuthLoading,
  } =
    useAuth();

  const [
    mfaState,
    setMfaState,
  ] =
    useState<MfaState>(
      "LOADING",
    );

  /*
   * The TOTP secret and setup URI are intentionally kept only
   * in component memory during the setup flow.
   *
   * They must never be persisted in localStorage, cookies,
   * logs, analytics, or application databases.
   */
  const [
    sharedSecret,
    setSharedSecret,
  ] =
    useState("");

  const [
    setupUri,
    setSetupUri,
  ] =
    useState("");

  const [
    verificationCode,
    setVerificationCode,
  ] =
    useState("");

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
    isWorking,
    setIsWorking,
  ] =
    useState(false);

  useEffect(() => {
    if (
      isAuthLoading
    ) {
      return;
    }

    if (
      !isAuthenticated
    ) {
      router.replace(
        "/auth",
      );

      return;
    }

    let isCancelled =
      false;

    async function loadMfaStatus() {
      setMfaState(
        "LOADING",
      );

      try {
        const {
          enabled,
          preferred,
        } =
          await fetchMFAPreference();

        if (
          isCancelled
        ) {
          return;
        }

        const totpEnabled =
          enabled?.includes(
            "TOTP",
          ) ?? false;

        if (
          totpEnabled &&
          preferred ===
            "TOTP"
        ) {
          setMfaState(
            "ACTIVE",
          );

          return;
        }

        if (
          totpEnabled
        ) {
          setMfaState(
            "ENABLED_NOT_PREFERRED",
          );

          return;
        }

        setMfaState(
          "DISABLED",
        );
      } catch (
        caughtError
      ) {
        if (
          isCancelled
        ) {
          return;
        }

        console.error(
          "Failed to fetch MFA preference.",
          {
            errorName:
              caughtError
                instanceof Error
                ? caughtError.name
                : "UnknownError",
          },
        );

        setMfaState(
          "ERROR",
        );

        setError(
          "Nie udało się sprawdzić konfiguracji MFA.",
        );
      }
    }

    void loadMfaStatus();

    return () => {
      isCancelled =
        true;
    };
  }, [
    isAuthenticated,
    isAuthLoading,
    router,
  ]);

  async function startSetup() {
    setError("");
    setMessage("");
    setIsWorking(
      true,
    );

    try {
      const setup =
        await setUpTOTP();

      /*
       * Amplify builds a standard otpauth:// URI containing the
       * TOTP secret and issuer metadata.
       *
       * This URI is rendered directly as a QR code in the browser.
       * It is never sent to another service.
       */
      const uri =
        setup
          .getSetupUri(
            TOTP_ISSUER,
          )
          .toString();

      setSharedSecret(
        setup.sharedSecret,
      );

      setSetupUri(
        uri,
      );

      setVerificationCode(
        "",
      );
    } catch (
      caughtError
    ) {
      console.error(
        "Failed to start TOTP setup.",
        {
          errorName:
            caughtError
              instanceof Error
              ? caughtError.name
              : "UnknownError",
        },
      );

      setError(
        "Nie udało się rozpocząć konfiguracji TOTP.",
      );
    } finally {
      setIsWorking(
        false,
      );
    }
  }

  async function verifySetup() {
    setError("");
    setMessage("");

    if (
      verificationCode.length !==
      6
    ) {
      setError(
        "Wpisz pełny 6-cyfrowy kod.",
      );

      return;
    }

    setIsWorking(
      true,
    );

    try {
      await verifyTOTPSetup({
        code:
          verificationCode,
      });

      await updateMFAPreference({
        totp:
          "PREFERRED",
      });

      const {
        enabled,
        preferred,
      } =
        await fetchMFAPreference();

      const isConfigured =
        enabled?.includes(
          "TOTP",
        ) === true &&
        preferred ===
          "TOTP";

      if (
        !isConfigured
      ) {
        throw new Error(
          "TOTP preference verification failed.",
        );
      }

      /*
       * Remove sensitive setup material from component memory
       * immediately after successful verification.
       */
      setSharedSecret(
        "",
      );

      setSetupUri(
        "",
      );

      setVerificationCode(
        "",
      );

      setMfaState(
        "ACTIVE",
      );

      /*
       * Force a new authentication flow so the administrator
       * immediately verifies that TOTP is required at sign-in.
       */
      try {
        await signOut({
          global: true,
        });

        router.replace(
          "/auth",
        );

        router.refresh();
      } catch (
        caughtError
      ) {
        console.error(
          "TOTP was enabled but global sign-out failed.",
          {
            errorName:
              caughtError
                instanceof Error
                ? caughtError.name
                : "UnknownError",
          },
        );

        setMessage(
          "TOTP zostało poprawnie włączone. Wyloguj się ręcznie i zaloguj ponownie, aby sprawdzić drugi składnik.",
        );
      }
    } catch (
      caughtError
    ) {
      console.error(
        "Failed to verify TOTP setup.",
        {
          errorName:
            caughtError
              instanceof Error
                ? caughtError.name
                : "UnknownError",
        },
      );

      setError(
        getTotpSetupErrorMessage(
          caughtError,
        ),
      );
    } finally {
      setIsWorking(
        false,
      );
    }
  }

  async function makeTotpPreferred() {
    setError("");
    setMessage("");
    setIsWorking(
      true,
    );

    try {
      await updateMFAPreference({
        totp:
          "PREFERRED",
      });

      const {
        enabled,
        preferred,
      } =
        await fetchMFAPreference();

      if (
        enabled?.includes(
          "TOTP",
        ) !== true ||
        preferred !==
          "TOTP"
      ) {
        throw new Error(
          "TOTP preference verification failed.",
        );
      }

      setMfaState(
        "ACTIVE",
      );

      await signOut({
        global: true,
      });

      router.replace(
        "/auth",
      );

      router.refresh();
    } catch (
      caughtError
    ) {
      console.error(
        "Failed to make TOTP preferred.",
        {
          errorName:
            caughtError
              instanceof Error
                ? caughtError.name
                : "UnknownError",
        },
      );

      setError(
        "Nie udało się ustawić TOTP jako preferowanej metody MFA.",
      );
    } finally {
      setIsWorking(
        false,
      );
    }
  }

  if (
    isAuthLoading ||
    mfaState ===
      "LOADING"
  ) {
    return (
      <Surface className="p-6">
        <p className="text-zinc-400">
          Sprawdzanie konfiguracji MFA...
        </p>
      </Surface>
    );
  }

  if (
    mfaState ===
    "ERROR"
  ) {
    return (
      <Surface className="p-6">
        <h1 className="text-2xl font-semibold text-zinc-100">
          Uwierzytelnianie dwuskładnikowe
        </h1>

        <div className="mt-5">
          <StatusMessage tone="error">
            {error}
          </StatusMessage>
        </div>
      </Surface>
    );
  }

  if (
    mfaState ===
    "ACTIVE"
  ) {
    return (
      <Surface className="p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
          MFA aktywne
        </p>

        <h1 className="mt-3 text-2xl font-semibold text-zinc-100">
          TOTP jest skonfigurowane
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
          Logowanie do tego konta wymaga hasła
          oraz aktualnego kodu z aplikacji
          uwierzytelniającej.
        </p>

        <p className="mt-4 text-sm text-zinc-500">
          Ze względów bezpieczeństwa aplikacja
          nie udostępnia opcji wyłączenia MFA
          z tego ekranu.
        </p>

        {message && (
          <div className="mt-5">
            <StatusMessage tone="success">
              {message}
            </StatusMessage>
          </div>
        )}
      </Surface>
    );
  }

  if (
    mfaState ===
    "ENABLED_NOT_PREFERRED"
  ) {
    return (
      <Surface className="p-6">
        <h1 className="text-2xl font-semibold text-zinc-100">
          Dokończ konfigurację MFA
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
          TOTP jest już przypisane do konta,
          ale nie jest ustawione jako preferowana metoda.
        </p>

        {error && (
          <div className="mt-5">
            <StatusMessage tone="error">
              {error}
            </StatusMessage>
          </div>
        )}

        <Button
          type="button"
          className="mt-6"
          disabled={
            isWorking
          }
          onClick={() =>
            void makeTotpPreferred()
          }
        >
          {isWorking
            ? "Zapisywanie..."
            : "Ustaw TOTP jako preferowane"}
        </Button>
      </Surface>
    );
  }

  return (
    <Surface className="p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
        Bezpieczeństwo konta
      </p>

      <h1 className="mt-3 text-2xl font-semibold text-zinc-100">
        Skonfiguruj TOTP
      </h1>

      <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
        Użyj aplikacji takiej jak Google Authenticator,
        Microsoft Authenticator lub innej zgodnej z TOTP.
      </p>

      {!sharedSecret ? (
        <Button
          type="button"
          className="mt-6"
          disabled={
            isWorking
          }
          onClick={() =>
            void startSetup()
          }
        >
          {isWorking
            ? "Przygotowywanie..."
            : "Rozpocznij konfigurację"}
        </Button>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm font-medium text-zinc-200">
              1. Zeskanuj kod QR w aplikacji Authenticator.
            </p>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              W Google Authenticator lub Microsoft Authenticator
              wybierz opcję dodania nowego konta i zeskanowania
              kodu QR.
            </p>

            {setupUri && (
              <div className="mt-5 flex justify-center sm:justify-start">
                <div className="rounded-xl bg-white p-4">
                  <QRCodeSVG
                    value={
                      setupUri
                    }
                    size={
                      220
                    }
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#000000"
                    title="Kod QR do konfiguracji TOTP"
                  />
                </div>
              </div>
            )}

            <p className="mt-4 text-xs leading-5 text-amber-300">
              Kod QR zawiera sekret MFA. Nie udostępniaj go,
              nie zapisuj w screenshotach i nie wysyłaj innym osobom.
            </p>

            <details className="mt-5 rounded-lg border border-zinc-800 bg-black p-4">
              <summary className="cursor-pointer text-sm font-medium text-zinc-300">
                Nie możesz zeskanować kodu QR?
              </summary>

              <div className="mt-4">
                <p className="text-sm text-zinc-400">
                  Dodaj konto ręcznie przy użyciu tego klucza:
                </p>

                <code className="mt-2 block break-all rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-sm text-blue-300">
                  {sharedSecret}
                </code>

                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  Klucz jest odpowiednikiem kodu QR i również
                  należy traktować go jak sekret.
                </p>
              </div>
            </details>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-zinc-200">
              2. Wpisz 6-cyfrowy kod wygenerowany przez aplikację.
            </p>

            <VerificationCodeInput
              value={
                verificationCode
              }
              onChange={
                setVerificationCode
              }
              disabled={
                isWorking
              }
            />
          </div>

          {error && (
            <StatusMessage tone="error">
              {error}
            </StatusMessage>
          )}

          <Button
            type="button"
            fullWidth
            disabled={
              isWorking ||
              verificationCode.length !==
                6
            }
            onClick={() =>
              void verifySetup()
            }
          >
            {isWorking
              ? "Weryfikowanie..."
              : "Włącz MFA"}
          </Button>
        </div>
      )}

      {error &&
        !sharedSecret && (
          <div className="mt-5">
            <StatusMessage tone="error">
              {error}
            </StatusMessage>
          </div>
        )}
    </Surface>
  );
}

function getTotpSetupErrorMessage(
  error: unknown,
): string {
  if (
    !(error instanceof Error)
  ) {
    return "Nie udało się skonfigurować TOTP.";
  }

  switch (
    error.name
  ) {
    case "CodeMismatchException":
      return "Kod jest nieprawidłowy. Poczekaj na nowy kod w aplikacji i spróbuj ponownie.";

    case "EnableSoftwareTokenMFAException":
      return "Nie udało się włączyć uwierzytelniania TOTP.";

    case "LimitExceededException":
    case "TooManyRequestsException":
      return "Wykonano zbyt wiele prób. Spróbuj ponownie później.";

    default:
      return "Nie udało się skonfigurować TOTP. Spróbuj ponownie.";
  }
}