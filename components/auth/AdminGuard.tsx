"use client";

import {
  type ReactNode,
  useEffect,
} from "react";

import { useRouter } from "next/navigation";

import { useAuth } from "./AuthProvider";

export default function AdminGuard({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  const {
    isAuthenticated,
    isAdmin,
    isLoading,
  } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }

    if (!isAdmin) {
      router.replace("/");
    }
  }, [
    isAuthenticated,
    isAdmin,
    isLoading,
    router,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        Sprawdzanie uprawnień...
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        Przekierowywanie...
      </div>
    );
  }

  return children;
}