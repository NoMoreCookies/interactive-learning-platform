import Link from "next/link";

type DashboardCardProps = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
};

function DashboardCard({
  href,
  eyebrow,
  title,
  description,
  icon,
}: DashboardCardProps) {
  return (
    <Link
      href={href}
      className="
        group
        relative
        block
        h-full
        w-full
        overflow-hidden
        rounded-3xl
        border
        border-zinc-800
        bg-zinc-950/50
        p-6
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-blue-500/50
        hover:bg-zinc-900/70
        hover:shadow-xl
        hover:shadow-blue-950/20
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-blue-500
        focus-visible:ring-offset-2
        focus-visible:ring-offset-[#020617]
      "
    >
      <div className="flex items-start justify-between gap-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-400">
          {icon}
        </span>

        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 text-zinc-500 transition-all duration-300 group-hover:translate-x-1 group-hover:border-blue-500/40 group-hover:text-blue-400">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
          >
            <path
              d="M5 12h14m-5-5 5 5-5 5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      <p className="mt-7 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-100 transition-colors group-hover:text-blue-300">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-6 text-zinc-400">
        {description}
      </p>
    </Link>
  );
}

export default function AdminPage() {
  return (
    <main>
      <header className="animate-course-card rounded-3xl border border-zinc-800 bg-zinc-950/30 px-7 py-8 backdrop-blur-sm sm:px-9 sm:py-10">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-400">
          Administracja
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Dashboard
        </h1>

        <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-400">
          Zarządzaj kursami, modułami,
          lekcjami, filmami, materiałami,
          notatkami oraz zadaniami.
        </p>
      </header>

      <section
        aria-labelledby="admin-content-heading"
        className="mt-10"
      >
        <div>
          <p className="text-sm uppercase tracking-widest text-zinc-500">
            Zawartość platformy
          </p>

          <h2
            id="admin-content-heading"
            className="mt-2 text-2xl font-semibold text-zinc-100"
          >
            Zarządzanie
          </h2>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div
            className="animate-course-card"
            style={{
              animationDelay: "80ms",
            }}
          >
            <DashboardCard
              href="/admin/courses"
              eyebrow="Kursy"
              title="Zarządzaj kursami"
              description="Twórz kursy oraz dodawaj do nich moduły, lekcje, filmy, materiały, notatki i zadania."
              icon={
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-6 w-6"
                >
                  <path
                    d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 5.5A2.5 2.5 0 0 1 6.5 8H20"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />
          </div>
        </div>
      </section>
    </main>
  );
}