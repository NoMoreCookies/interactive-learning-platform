export default function LessonLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl animate-pulse px-6 py-12">
      <div className="h-4 w-48 rounded bg-zinc-800" />

      <div className="mt-5 h-11 w-3/4 rounded bg-zinc-800" />

      <div className="mt-4 h-5 w-full rounded bg-zinc-900" />
      <div className="mt-3 h-5 w-2/3 rounded bg-zinc-900" />

      <div className="mt-10 aspect-video w-full rounded-2xl border border-zinc-800 bg-zinc-950/50" />

      <div className="mt-10 space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <section
            key={index}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6"
          >
            <div className="h-7 w-48 rounded bg-zinc-800" />
            <div className="mt-5 h-4 w-full rounded bg-zinc-900" />
            <div className="mt-3 h-4 w-5/6 rounded bg-zinc-900" />
            <div className="mt-3 h-4 w-2/3 rounded bg-zinc-900" />
          </section>
        ))}
      </div>
    </main>
  );
}