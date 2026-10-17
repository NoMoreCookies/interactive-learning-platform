"use client";

import {
  type ReactNode,
  useEffect,
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
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    isCurrentLegalVerified,
    markCurrentLegalVerified,
  } = useAuth();

  const userId = user?.userId ?? null;

  const isPathAllowed =
    isAllowedPath(pathname);

  const shouldCheckLegal =
    !isAuthLoading &&
    isAuthenticated &&
    !isPathAllowed &&
    !isCurrentLegalVerified;

  useEffect(() => {
    if (
      !shouldCheckLegal ||
      !userId
    ) {
      return;
    }

    let isCancelled = false;

    async function checkLegalAccess() {
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
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.error(
          "Failed to verify legal access:",
          error,
        );

        router.replace(
          "/auth?legal=required",
        );
      }
    }

    void checkLegalAccess();

    return () => {
      isCancelled = true;
    };
  }, [
    shouldCheckLegal,
    userId,
    markCurrentLegalVerified,
    router,
  ]);

  if (
    isAuthLoading ||
    shouldCheckLegal
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