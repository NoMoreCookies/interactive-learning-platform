"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchAuthSession,
  getCurrentUser,
  signOut,
  type AuthUser,
} from "aws-amplify/auth";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextValue | null>(null);

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

  const refreshAuth =
    useCallback(async () => {
      setIsLoading(true);

      try {
        const [
          currentUser,
          session,
        ] = await Promise.all([
          getCurrentUser(),
          fetchAuthSession(),
        ]);

        const groups = readGroups(
          session.tokens?.accessToken.payload[
            "cognito:groups"
          ],
        );

        setUser(currentUser);
        setIsAdmin(
          groups.includes("ADMIN"),
        );
      } catch {
        setUser(null);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  async function logout() {
    await signOut();

    setUser(null);
    setIsAdmin(false);
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isAdmin,
      isLoading,
      refreshAuth,
      logout,
    }),
    [
      user,
      isAdmin,
      isLoading,
      refreshAuth,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth musi być używany wewnątrz AuthProvider.",
    );
  }

  return context;
}