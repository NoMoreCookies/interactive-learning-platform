import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dla kogo są kursy",
  description:
    "Sprawdź, dla kogo przeznaczone są kursy matematyki, fizyki i informatyki.",
};

const audiences = [
  {
    title: "Dla maturzystów",
    description:
      "Dla osób przygotowujących się do matury podstawowej lub rozszerzonej, które potrzebują uporządkowanej teorii i praktycznych zadań.",
  },
  {
    title: "Dla uczniów szkół średnich",
    description:
      "Dla uczniów, którzy chcą lepiej zrozumieć materiał omawiany na lekcjach i uzupełnić zaległości.",
  },
  {
    title: "Dla osób uczących się samodzielnie",
    description:
      "Dla każdego, kto chce rozwijać swoje umiejętności bez sztywnego planu i uczyć się we własnym tempie.",
  },
  {
    title: "Dla początkujących programistów",
    description:
      "Dla osób rozpoczynających naukę programowania i algorytmiki, które potrzebują jasnego wprowadzenia do podstaw.",
  },
];

const expectations = [
  "Chcesz zrozumieć materiał, a nie tylko zapamiętać wzory.",
  "Potrzebujesz kursu podzielonego na krótkie i konkretne lekcje.",
  "Lubisz sprawdzać wiedzę za pomocą zadań.",
  "Chcesz mieć dostęp do odpowiedzi i pełnych rozwiązań.",
  "Szukasz materiałów, do których możesz wracać w dowolnym momencie.",
];

export default function ForWhomPage() {
  return (
    <main className="min-h-screen">
      <section className="border-b border-zinc-800/70">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
              Dla kogo
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-100 sm:text-6xl">
              Kursy stworzone dla osób, które chcą naprawdę zrozumieć materiał
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
              Nie musisz być najlepszy w klasie ani znać wszystkich podstaw.
              Najważniejsza jest chęć systematycznej nauki i rozwiązywania
              zadań.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-2">
          {audiences.map((audience) => (
            <article
              key={audience.title}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-8 transition-colors hover:border-zinc-700"
            >
              <div className="h-1 w-12 rounded-full bg-blue-500" />

              <h2 className="mt-6 text-2xl font-semibold text-zinc-100">
                {audience.title}
              </h2>

              <p className="mt-4 leading-7 text-zinc-400">
                {audience.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-800/70 bg-zinc-950/30">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
              Czy to dla Ciebie?
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-100">
              Te kursy mogą Ci pomóc, jeśli...
            </h2>

            <p className="mt-5 max-w-lg leading-7 text-zinc-400">
              Materiały są przygotowane tak, aby prowadzić Cię od podstaw do
              coraz trudniejszych zagadnień.
            </p>
          </div>

          <ul className="space-y-4">
            {expectations.map((expectation) => (
              <li
                key={expectation}
                className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-5"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="m5 12 4 4L19 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <span className="leading-7 text-zinc-300">
                  {expectation}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-8 rounded-3xl border border-zinc-800 bg-zinc-950/40 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-100">
              Wybierz kurs i sprawdź pierwszą lekcję
            </h2>

            <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
              Zobacz dostępne kursy i wybierz temat, od którego chcesz zacząć.
            </p>
          </div>

          <Link
            href="/courses"
            className="inline-flex items-center justify-center rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
          >
            Zobacz kursy
          </Link>
        </div>
      </section>
    </main>
  );
}