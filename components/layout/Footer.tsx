import Link from "next/link";


export default function Footer() {
  const currentYear = new Date().getFullYear();


  return (
    <footer
      id="kontakt"
      className="border-t border-zinc-800/80 bg-zinc-950/40"
    >
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="max-w-md">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-zinc-100"
            >
              Po prostu nauka
            </Link>


            <p className="mt-4 text-sm leading-7 text-zinc-400">
              Matematyka, fizyka i informatyka wyjaśnione w prosty,
              uporządkowany i praktyczny sposób.
            </p>
          </div>


          <div className="md:justify-self-end md:text-right">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-300">
              Kontakt
            </h2>


            <div className="mt-4 space-y-3 text-sm text-zinc-400">
              <a
                href="mailto:kontakt@twojadomena.pl"
                className="block transition-colors hover:text-blue-400"
              >
                kontakt@twojadomena.pl
              </a>


              <p className="max-w-sm">
                Masz pytanie dotyczące kursu lub materiałów? Napisz do mnie.
              </p>
            </div>
          </div>
        </div>


        <div className="mt-10 border-t border-zinc-800 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500">
              © {currentYear} Po prostu nauka. Wszystkie prawa zastrzeżone.
            </p>


            <nav
              aria-label="Dokumenty prawne"
              className="flex flex-wrap gap-x-5 gap-y-2 text-sm"
            >
              <Link
                href="/termsAndConditions"
                className="text-zinc-500 transition-colors hover:text-zinc-200"
              >
                Regulamin
              </Link>


              <Link
                href="/privacyPolicy"
                className="text-zinc-500 transition-colors hover:text-zinc-200"
              >
                Polityka prywatności i cookies
              </Link>
            </nav>
          </div>


          <p className="mt-4 text-sm text-zinc-500 sm:text-right">
            Matematyka • Fizyka • Informatyka
          </p>
        </div>
      </div>
    </footer>
  );
}