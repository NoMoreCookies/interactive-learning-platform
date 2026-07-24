import Link from "next/link";

export default function Navbar() {
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
            href="/#kontakt"
            className="transition-colors hover:text-white"
          >
            Kontakt
          </Link>
        </div>

        <div className="flex items-center gap-3">
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
        </div>
      </nav>
    </header>
  );
}