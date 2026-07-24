export default function AuthSidebar() {
  return (
    <aside className="hidden flex-col justify-center px-10 py-12 lg:flex">
      <div className="max-w-sm">
        <h1 className="text-5xl font-bold leading-tight tracking-tight text-white">
          Ucz się
          <br />
          w swoim tempie.
        </h1>

        <p className="mt-6 text-lg leading-8 text-slate-400">
          Matematyka, fizyka i informatyka w jednym miejscu.
        </p>

        <div className="mt-10 space-y-5">
          <Feature text="Lekcje wideo krok po kroku" />
          <Feature text="Ćwiczenia i zadania" />
          <Feature text="Śledzenie postępów" />
        </div>
      </div>
    </aside>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-slate-300">
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-blue-500/40 bg-blue-500/10 text-sm font-semibold text-blue-400">
        ✓
      </span>

      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}