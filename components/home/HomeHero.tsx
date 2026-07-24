import Image from "next/image";
import Link from "next/link";

export default function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Glow w tle */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[42%] top-[42%] h-80 w-80 rounded-full bg-blue-600/10 blur-3xl"
      />

      <div className="mx-auto grid min-h-[calc(100vh-112px)] max-w-7xl items-center gap-8 px-6 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-10">
        {/* LEWA STRONA */}
        <div className="relative z-10 max-w-xl">
          <h1 className="fade-in text-5xl font-bold leading-[0.98] tracking-tight text-zinc-100 sm:text-6xl lg:text-7xl">
            Uczę się

            <span className="mt-2 block text-blue-500">
              matmy i fizy.
            </span>
          </h1>

          <p className="fade-in fade-in-delay-1 mt-7 max-w-lg text-lg leading-8 text-zinc-400 sm:text-xl">
            Zrozum teorię, rozwiązuj zadania i osiągaj lepsze wyniki
            na maturze i w szkole.
          </p>

          <div className="fade-in fade-in-delay-2 mt-8">
            <Link
              href="/courses"
              className="group inline-flex items-center gap-3 rounded-xl bg-blue-600 px-7 py-4 text-base font-semibold text-white shadow-lg shadow-blue-950/40 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              Przeglądaj kursy

              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
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

        {/* PRAWA STRONA */}
        <div className="relative flex min-h-[420px] items-center justify-center lg:justify-end">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute h-80 w-80 rounded-full bg-blue-600/15 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-8 h-24 w-2/3 rounded-full bg-blue-600/10 blur-3xl"
          />

<Image
  src="/hero/futuristic-book.png"
  alt="Futurystyczna książka symbolizująca naukę matematyki, fizyki i informatyki"
  width={800}
  height={800}
  priority
  className="animate-book-float relative z-10 h-auto w-full max-w-[720px] select-none object-contain  lg:-translate-y-12
  "
/>
        </div>
      </div>
    </section>
  );
}