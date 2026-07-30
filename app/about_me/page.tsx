import Image from "next/image";
import Link from "next/link";

const achievements = [
  {
    value: "6+",
    label: "lat doświadczenia w nauczaniu",
  },
  {
    value: "100%",
    label: "z matematyki rozszerzonej",
  },
  {
    value: "90%",
    label: "z fizyki rozszerzonej",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#020617] text-zinc-100">
      <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300">
              O mnie
            </span>

            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Cześć, jestem Kacper.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
              Od kilku lat pomagam uczniom przygotować się do matury
              rozszerzonej z matematyki i fizyki. Zależy mi na tym, aby trudne
              zagadnienia tłumaczyć jasno, logicznie i bez niepotrzebnego
              komplikowania.
            </p>

            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
              Stworzyłem tę platformę, ponieważ chciałem zebrać w jednym miejscu
              uporządkowane lekcje, zadania, notatki i materiały, do których
              można wracać w dowolnym momencie.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/courses"
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#020617]"
              >
                Zobacz kursy
              </Link>

              <Link
                href="/kontakt"
                className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-6 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-[#020617]"
              >
                Kontakt
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-4 rounded-[2rem] bg-blue-500/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-900 shadow-2xl shadow-blue-950/30">
              <div className="relative aspect-[4/5]">
                <Image
                  src="/me/me.jpg"
                  alt="Kacper — autor platformy edukacyjnej"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 420px"
                  className="object-cover"
                />
              </div>

              <div className="border-t border-zinc-800 px-6 py-5">
                <p className="font-semibold text-white">Kacper</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Autor kursów i twórca platformy
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.label}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6"
            >
              <p className="text-3xl font-bold text-blue-400">
                {achievement.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {achievement.label}
              </p>
            </div>
          ))}
        </div>

        <section className="mt-20 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 sm:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
              Moje podejście
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
              Najpierw zrozumienie, później schematy
            </h2>

            <p className="mt-5 text-base leading-7 text-zinc-300">
              Nie chcę, żeby nauka sprowadzała się wyłącznie do zapamiętywania
              wzorów. Każda lekcja ma pomóc zrozumieć, skąd bierze się dane
              rozwiązanie, jak rozpoznać typ zadania i jak samodzielnie dojść do
              poprawnego wyniku.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}