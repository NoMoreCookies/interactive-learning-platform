import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="p-10">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
        Administracja
      </p>

      <h1 className="mt-3 text-4xl font-bold">
        Dashboard
      </h1>

      <p className="mt-4 max-w-2xl text-zinc-400">
        Twórz kursy, dodawaj moduły, lekcje,
        filmy, materiały, notatki oraz zadania.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/admin/courses"
          className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-zinc-600"
        >
          <p className="text-sm text-zinc-500">
            Zawartość
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Zarządzaj kursami
          </h2>

          <p className="mt-3 text-sm text-zinc-400">
            Dodawaj kursy, moduły i lekcje.
          </p>
        </Link>
      </div>
    </main>
  );
}