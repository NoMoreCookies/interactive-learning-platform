"use client";

import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

import {
  fetchMFAPreference,
} from "aws-amplify/auth";

import {
  useRouter,
} from "next/navigation";

import {
  useAuth,
} from "./AuthProvider";

type AdminMfaState =
  | "CHECKING"
  | "READY"
  | "SETUP_REQUIRED"
  | "ERROR";

export default function AdminGuard({
  children,
}: {
  children:
    ReactNode;
}) {
  const router =
    useRouter();

  const {
    isAuthenticated,
    isAdmin,
    isLoading,
  } =
    useAuth();

  const [
    mfaState,
    setMfaState,
  ] =
    useState<AdminMfaState>(
      "CHECKING",
    );

  useEffect(() => {
    if (
      isLoading
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

    if (
      !isAdmin
    ) {
      router.replace(
        "/",
      );

      return;
    }

    let isCancelled =
      false;

    async function verifyAdminMfa() {
      setMfaState(
        "CHECKING",
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

        const hasRequiredTotp =
          enabled?.includes(
            "TOTP",
          ) === true &&
          preferred ===
            "TOTP";

        if (
          !hasRequiredTotp
        ) {
          setMfaState(
            "SETUP_REQUIRED",
          );

          router.replace(
            "/account/security",
          );

          return;
        }

        setMfaState(
          "READY",
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
          "Failed to verify ADMIN MFA configuration.",
          {
            errorName:
              caughtError
                instanceof Error
                ? caughtError.name
                : "UnknownError",
          },
        );

        /*
         * Fail closed.
         *
         * If the MFA status cannot be verified, the application
         * does not render privileged ADMIN UI.
         */
        setMfaState(
          "ERROR",
        );

        router.replace(
          "/account/security",
        );
      }
    }

    void verifyAdminMfa();

    return () => {
      isCancelled =
        true;
    };
  }, [
    isAuthenticated,
    isAdmin,
    isLoading,
    router,
  ]);

  if (
    isLoading ||
    mfaState ===
      "CHECKING"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        Sprawdzanie
        uprawnień...
      </div>
    );
  }

  if (
    !isAuthenticated ||
    !isAdmin
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        Przekierowywanie...
      </div>
    );
  }

  if (
    mfaState !==
    "READY"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        Wymagana konfiguracja
        uwierzytelniania
        dwuskładnikowego...
      </div>
    );
  }

  return children;
}