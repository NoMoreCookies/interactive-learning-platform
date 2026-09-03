"use client";

import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";

import {
  getLegalUpdateRequirement,
} from "@/lib/legal-acceptance";

type LegalAccessGuardProps = {
  children: ReactNode;
};

const ALLOWED_PATHS = [
  "/auth",
  "/termsAndConditions",
  "/privacyPolicy",
];

export default function LegalAccessGuard({
  children,
}: LegalAccessGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    isCurrentLegalVerified,
    markCurrentLegalVerified,
  } = useAuth();

  const [
    isCheckingLegal,
    setIsCheckingLegal,
  ] = useState(false);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      setIsCheckingLegal(false);
      return;
    }

    if (isAllowedPath(pathname)) {
      setIsCheckingLegal(false);
      return;
    }

    if (isCurrentLegalVerified) {
      setIsCheckingLegal(false);
      return;
    }

    let isCancelled = false;

    async function checkLegalAccess() {
      setIsCheckingLegal(true);

      try {
        const requirement =
          await getLegalUpdateRequirement();

        if (isCancelled) {
          return;
        }

        if (requirement !== "none") {
          router.replace(
            "/auth?legal=required",
          );

          return;
        }

        markCurrentLegalVerified();

        setIsCheckingLegal(false);
      } catch (error) {
        console.error(
          "Failed to verify legal access:",
          error,
        );

        if (!isCancelled) {
          router.replace(
            "/auth?legal=required",
          );
        }
      }
    }

    void checkLegalAccess();

    return () => {
      isCancelled = true;
    };
  }, [
    isAuthenticated,
    isAuthLoading,
    isCurrentLegalVerified,
    markCurrentLegalVerified,
    pathname,
    router,
  ]);

  if (
    isAuthLoading ||
    isCheckingLegal
  ) {
    return null;
  }

  return children;
}

function isAllowedPath(
  pathname: string,
): boolean {
  return ALLOWED_PATHS.some(
    (allowedPath) =>
      pathname === allowedPath ||
      pathname.startsWith(
        `${allowedPath}/`,
      ),
  );
}