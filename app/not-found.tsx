import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-20">
      <div className="max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
          Błąd 404
        </p>

        <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
          Nie znaleziono tej strony
        </h1>

        <p className="mt-5 text-lg leading-8 text-zinc-400">
          Adres może być nieprawidłowy albo strona została przeniesiona.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Strona główna
          </Link>

          <Link
            href="/courses"
            className="rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900"
          >
            Zobacz kursy
          </Link>
        </div>
      </div>
    </main>
  );
}