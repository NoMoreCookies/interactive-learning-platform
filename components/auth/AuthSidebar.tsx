const features = [
  "Lekcje wideo krok po kroku",
  "Ćwiczenia i zadania",
  "Śledzenie postępów",
] as const;

export default function AuthSidebar() {
  return (
    <aside className="hidden flex-col justify-center py-12 lg:flex">
      <div className="max-w-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-400">
          Po prostu nauka
        </p>

        <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight text-zinc-100">
          Ucz się
          <br />
          w swoim tempie.
        </h1>

        <p className="mt-6 text-lg leading-8 text-zinc-400">
          Matematyka, fizyka i informatyka
          w jednym miejscu.
        </p>

        <div className="mt-10 space-y-5">
          {features.map((feature) => (
            <Feature
              key={feature}
              text={feature}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

function Feature({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 text-zinc-300">
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-blue-500/40 bg-blue-500/10 text-sm font-semibold text-blue-400">
        ✓
      </span>

      <span className="text-sm font-medium">
        {text}
      </span>
    </div>
  );
}
