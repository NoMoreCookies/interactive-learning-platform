import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <header className="mx-auto w-full max-w-7xl px-6 pt-6">
      <nav className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/70 px-5 py-4 backdrop-blur">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <div className="leading-none">


          <span className="text-lg font-bold text-zinc-100">
            Witaj
          </span>

          </div>
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
            href="/#kontakt"
            className="transition-colors hover:text-white"
          >
            Kontakt
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-xl px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white sm:block"
          >
            Zaloguj się
          </Link>

          <Link
            href="/register"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            Zarejestruj się
          </Link>
        </div>
      </nav>
    </header>
  );
}