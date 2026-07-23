import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "O platformie",
  description:
    "Dowiedz się, jak działa platforma edukacyjna z kursami matematyki, fizyki i informatyki.",
};

const features = [
  {
    title: "Uporządkowana teoria",
    description:
      "Każda lekcja zawiera najważniejsze definicje, wzory i przykłady przedstawione bez zbędnego komplikowania.",
  },
  {
    title: "Zadania z rozwiązaniami",
    description:
      "Po teorii możesz samodzielnie rozwiązać zadania, a następnie sprawdzić odpowiedź i pełny tok rozwiązania.",
  },
  {
    title: "Nauka we własnym tempie",
    description:
      "Materiały są podzielone na kursy, moduły i krótkie lekcje, dzięki czemu możesz uczyć się wtedy, kiedy masz czas.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <section className="border-b border-zinc-800/70">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
              O platformie
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-100 sm:text-6xl">
              Nauka bez niepotrzebnego chaosu
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
              Platforma powstała po to, aby trudne zagadnienia z matematyki,
              fizyki i informatyki przedstawiać w prosty, logiczny i
              uporządkowany sposób.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
              Dlaczego powstała?
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-100">
              Zrozumienie jest ważniejsze niż zapamiętywanie
            </h2>
          </div>

          <div className="space-y-6 text-base leading-8 text-zinc-400">
            <p>
              Wiele materiałów edukacyjnych pokazuje jedynie gotowe wzory lub
              rozwiązania. Tutaj celem jest pokazanie, skąd wynikają kolejne
              kroki i dlaczego dana metoda działa.
            </p>

            <p>
              Każdy kurs jest podzielony na moduły, a moduły na lekcje.
              Dzięki temu możesz skupić się na jednym zagadnieniu, zamiast
              przeglądać długie i nieuporządkowane materiały.
            </p>

            <p>
              Platforma jest rozwijana stopniowo. Z czasem pojawią się kolejne
              kursy, zadania, materiały dodatkowe oraz funkcje pozwalające
              śledzić postępy w nauce.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-800/70 bg-zinc-950/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
              Jak wygląda nauka?
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-100">
              Teoria, zadania i pełne rozwiązania
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-7"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-500/50 bg-blue-500/10 text-sm font-semibold text-blue-400">
                  {index + 1}
                </span>

                <h3 className="mt-6 text-xl font-semibold text-zinc-100">
                  {feature.title}
                </h3>

                <p className="mt-3 leading-7 text-zinc-400">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-3xl border border-blue-500/20 bg-blue-500/5 px-8 py-12 text-center sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100">
            Zacznij od wybranego przedmiotu
          </h2>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-zinc-400">
            Wybierz matematykę, fizykę lub informatykę i przejdź do dostępnych
            kursów.
          </p>

          <Link
            href="/courses"
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
          >
            Przeglądaj kursy
          </Link>
        </div>
      </section>
    </main>
  );
}