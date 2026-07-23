"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function ErrorPage({
  error,
  reset,
}: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-20">
      <div className="max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-red-400">
          Wystąpił błąd
        </p>

        <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-100">
          Nie udało się załadować strony
        </h1>

        <p className="mt-5 text-lg leading-8 text-zinc-400">
          Spróbuj ponownie. Jeśli problem nadal występuje, wróć na stronę
          główną.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-8 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-500"
        >
          Spróbuj ponownie
        </button>
      </div>
    </main>
  );
}