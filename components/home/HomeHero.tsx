import Image from "next/image";
import Link from "next/link";

export default function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/3 top-1/3 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl"
      />

      <div className="mx-auto grid min-h-[calc(100vh-112px)] max-w-7xl items-center gap-12 px-6 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:py-16">
        <div className="relative z-10 max-w-xl">
          <h1 className="text-5xl font-bold leading-[0.98] tracking-tight text-zinc-100 sm:text-6xl lg:text-7xl">
            Uczę się
            <span className="mt-2 block text-blue-500">
              matmy i fizy.
            </span>
          </h1>

          <p className="mt-8 max-w-lg text-lg leading-8 text-zinc-400 sm:text-xl">
            Zrozum teorię, rozwiązuj zadania i osiągaj lepsze wyniki
            na maturze i w szkole.
          </p>

          <div className="mt-9">
            <Link
              href="/courses"
              className="inline-flex items-center gap-3 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-blue-950/40 transition hover:-translate-y-0.5 hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              Przeglądaj kursy

              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M5 12h14m-6-6 6 6-6 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>

            <div className="relative flex justify-center lg:justify-end">
            <Image
                src="/landing/hero-teacher.png"
                alt="Nauczyciel wyjaśniający matematykę"
                width={900}
                height={700}
                priority
                className="h-auto w-full max-w-[700px] object-contain"
            />
            </div>
      </div>
    </section>
  );
}