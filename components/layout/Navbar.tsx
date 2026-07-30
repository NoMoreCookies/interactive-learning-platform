"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";

export default function Navbar() {
  const {
    isAuthenticated,
    isLoading,
  } = useAuth();

  return (
    <header className="mx-auto w-full max-w-7xl px-6 pt-6">
      <nav className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/70 px-5 py-4 backdrop-blur">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span className="text-lg font-bold text-zinc-100">
            Witaj
          </span>
        </Link>

        <div className="hidden items-center gap-8 text-sm text-zinc-300 md:flex">
          <Link
            href="/courses"
            className="transition-colors hover:text-white"
          >
            Kursy
          </Link>

          <Link
            href="/about"
            className="transition-colors hover:text-white"
          >
            O platformie
          </Link>

          <Link
            href="/for-whom"
            className="transition-colors hover:text-white"
          >
            Dla kogo?
          </Link>


          <Link
            href="/about_me"
            className="transition-colors hover:text-white"
          >
            O mnie
          </Link>


          <Link
            href="/#kontakt"
            className="transition-colors hover:text-white"
          >
            Kontakt
          </Link>
        </div>

        <div className="flex min-w-[150px] justify-end">
          {isLoading ? (
            <div className="h-10 w-28 animate-pulse rounded-xl bg-zinc-800" />
          ) : isAuthenticated ? (
            <Link
              href="/account"
              className="
                inline-flex items-center justify-center
                rounded-xl
                border border-zinc-700
                px-5 py-2.5
                text-sm font-semibold text-zinc-200
                transition-all
                hover:-translate-y-0.5
                hover:border-zinc-500
                hover:bg-zinc-900
                hover:text-white
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-blue-500
                focus-visible:ring-offset-2
                focus-visible:ring-offset-zinc-950
              "
            >
              Konto
            </Link>
          ) : (
            <Link
              href="/auth"
              className="
                inline-flex items-center justify-center
                rounded-xl
                bg-blue-600
                px-5 py-2.5
                text-sm font-semibold text-white
                shadow-lg shadow-blue-500/20
                transition-all
                hover:-translate-y-0.5
                hover:bg-blue-700
                hover:shadow-xl
                hover:shadow-blue-500/25
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-blue-500
                focus-visible:ring-offset-2
                focus-visible:ring-offset-zinc-950
              "
            >
              Zaloguj / Zarejestruj
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}