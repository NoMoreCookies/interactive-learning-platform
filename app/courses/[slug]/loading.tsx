export default function CourseLoading() {
  return (
    <main className="min-h-screen animate-pulse">
      <section className="mx-auto grid min-h-[320px] max-w-7xl grid-cols-1 items-center gap-8 px-6 py-10 lg:grid-cols-[1fr_1.5fr_1fr]">
        <div className="hidden h-64 rounded-2xl bg-zinc-900 lg:block" />

        <div className="mx-auto w-full max-w-2xl text-center">
          <div className="mx-auto h-12 w-3/4 rounded bg-zinc-800" />

          <div className="mx-auto mt-6 h-5 w-full rounded bg-zinc-900" />
          <div className="mx-auto mt-3 h-5 w-4/5 rounded bg-zinc-900" />
        </div>

        <div className="hidden h-64 rounded-2xl bg-zinc-900 lg:block" />
      </section>

      <section className="mx-auto max-w-4xl space-y-4 px-6 pb-16 pt-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 rounded-2xl border border-zinc-800 bg-zinc-950/40"
          />
        ))}
      </section>
    </main>
  );
}