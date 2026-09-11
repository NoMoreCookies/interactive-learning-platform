import TotpSetupCard from "@/components/auth/TotpSetupCard";

export default function AccountSecurityPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
          Konto
        </p>

        <h1 className="mt-3 text-3xl font-bold text-zinc-100">
          Bezpieczeństwo
        </h1>

        <p className="mt-3 leading-7 text-zinc-400">
          Zarządzaj dodatkowym
          zabezpieczeniem swojego
          konta.
        </p>
      </header>

      <TotpSetupCard />
    </main>
  );
}