"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";

export default function AccountPage() {
  const router = useRouter();

  const {
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    logout,
  } = useAuth();

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();

      router.push("/");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-16">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-zinc-400">
          Pobieranie danych konta...
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-16">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
          <h1 className="text-3xl font-bold">
            Musisz się zalogować
          </h1>

          <p className="mt-3 text-zinc-400">
            Zaloguj się, aby przejść do swojego konta.
          </p>

          <Link
            href="/auth"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Przejdź do logowania
          </Link>
        </div>
      </main>
    );
  }

  const email =
    user?.signInDetails?.loginId ??
    user?.username ??
    "Brak adresu e-mail";

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
        Konto użytkownika
      </p>

      <h1 className="mt-3 text-4xl font-bold">
        Moje konto
      </h1>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-500">
            Adres e-mail
          </p>

          <p className="mt-2 break-all font-semibold text-zinc-100">
            {email}
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-500">
            Typ konta
          </p>

          <p className="mt-2 font-semibold text-zinc-100">
            {isAdmin
              ? "Administrator"
              : "Użytkownik"}
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:col-span-2">
          <p className="text-sm text-zinc-500">
            Status abonamentu
          </p>

          <p className="mt-2 font-semibold text-yellow-300">
            Brak aktywnej subskrypcji
          </p>

          <p className="mt-3 text-sm text-zinc-400">
            Status zostanie podłączony do systemu płatności w kolejnym etapie.
          </p>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Panel administratora
          </Link>
        )}

        <button
          type="button"
          onClick={() =>
            void handleLogout()
          }
          disabled={isLoggingOut}
          className="rounded-xl border border-red-500/40 px-5 py-3 font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoggingOut
            ? "Wylogowywanie..."
            : "Wyloguj"}
        </button>
      </div>
    </main>
  );
}