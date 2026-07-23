export default function Loading() {
  return (
    <main className="mx-auto min-h-[60vh] w-full max-w-6xl px-6 py-16">
      <div className="animate-pulse">
        <div className="h-4 w-32 rounded bg-zinc-800" />

        <div className="mt-5 h-12 max-w-xl rounded bg-zinc-800" />

        <div className="mt-5 h-5 max-w-2xl rounded bg-zinc-900" />
        <div className="mt-3 h-5 max-w-lg rounded bg-zinc-900" />

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-64 rounded-2xl border border-zinc-800 bg-zinc-950/40"
            />
          ))}
        </div>
      </div>
    </main>
  );
}