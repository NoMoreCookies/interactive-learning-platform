import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-6 py-16">
      <section className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-8 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Płatność anulowana
        </p>

        <h1 className="mt-4 text-3xl font-bold text-zinc-100">
          Zakup nie został zakończony
        </h1>

        <p className="mt-4 max-w-xl leading-7 text-zinc-400">
          Wróciłeś z anulowanego procesu płatności.
          Możesz wrócić do swojego konta i rozpocząć zakup
          ponownie, kiedy będziesz gotowy.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/account#premium"
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Wróć do Premium
          </Link>

          <Link
            href="/courses"
            className="rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-zinc-200 transition hover:bg-zinc-900"
          >
            Przejdź do kursów
          </Link>
        </div>
      </section>
    </main>
  );
}