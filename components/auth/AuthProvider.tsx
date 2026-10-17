"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  fetchAuthSession,
  getCurrentUser,
  signOut,
  type AuthUser,
} from "aws-amplify/auth";

import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
} from "@/lib/legal";

type LegalVerification = {
  userId: string;
  termsVersion: string;
  privacyVersion: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;

  isCurrentLegalVerified: boolean;

  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
  markCurrentLegalVerified: () => void;
};

const AuthContext =
  createContext<AuthContextValue | null>(
    null,
  );

function readGroups(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (group): group is string =>
      typeof group === "string",
  );
}

export default function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    legalVerification,
    setLegalVerification,
  ] =
    useState<LegalVerification | null>(
      null,
    );

  const authRequestIdRef = useRef(0);

  const isLoggingOutRef =
    useRef(false);

  const refreshAuth =
    useCallback(async () => {
      if (isLoggingOutRef.current) {
        return;
      }

      const requestId =
        ++authRequestIdRef.current;

      setIsLoading(true);

      try {
        const [
          currentUser,
          session,
        ] = await Promise.all([
          getCurrentUser(),
          fetchAuthSession(),
        ]);

        if (
          isLoggingOutRef.current ||
          requestId !==
            authRequestIdRef.current
        ) {
          return;
        }

        const groups = readGroups(
          session.tokens?.accessToken.payload[
            "cognito:groups"
          ],
        );

        setUser(currentUser);

        setIsAdmin(
          groups.includes("ADMIN"),
        );

        setLegalVerification(
          (current) =>
            current?.userId ===
            currentUser.userId
              ? current
              : null,
        );
      } catch {
        if (
          isLoggingOutRef.current ||
          requestId !==
            authRequestIdRef.current
        ) {
          return;
        }

        setUser(null);
        setIsAdmin(false);
        setLegalVerification(null);
      } finally {
        if (
          !isLoggingOutRef.current &&
          requestId ===
            authRequestIdRef.current
        ) {
          setIsLoading(false);
        }
      }
    }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  const logout =
    useCallback(async () => {
      if (isLoggingOutRef.current) {
        return;
      }

      isLoggingOutRef.current = true;

      ++authRequestIdRef.current;

      setIsLoading(true);

      try {
        await signOut();

        setUser(null);
        setIsAdmin(false);
        setLegalVerification(null);
      } finally {
        isLoggingOutRef.current = false;
        setIsLoading(false);
      }
    }, []);

  const markCurrentLegalVerified =
    useCallback(() => {
      if (!user) {
        return;
      }

      setLegalVerification({
        userId: user.userId,
        termsVersion:
          CURRENT_TERMS_VERSION,
        privacyVersion:
          CURRENT_PRIVACY_VERSION,
      });
    }, [user]);

  const isCurrentLegalVerified =
    Boolean(
      user &&
        legalVerification &&
        legalVerification.userId ===
          user.userId &&
        legalVerification.termsVersion ===
          CURRENT_TERMS_VERSION &&
        legalVerification.privacyVersion ===
          CURRENT_PRIVACY_VERSION,
    );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isAdmin,
      isLoading,
      isCurrentLegalVerified,
      refreshAuth,
      logout,
      markCurrentLegalVerified,
    }),
    [
      user,
      isAdmin,
      isLoading,
      isCurrentLegalVerified,
      refreshAuth,
      logout,
      markCurrentLegalVerified,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth musi być używany wewnątrz AuthProvider.",
    );
  }

  return context;
}