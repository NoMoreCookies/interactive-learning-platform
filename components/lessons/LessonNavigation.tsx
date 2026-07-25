import Link from "next/link";

type NavigationLesson = {
  slug: string;
  title: string;
};

type LessonNavigationProps = {
  courseSlug: string;
  previousLesson?: NavigationLesson | null;
  nextLesson?: NavigationLesson | null;
};

export default function LessonNavigation({
  courseSlug,
  previousLesson,
  nextLesson,
}: LessonNavigationProps) {
  return (
    <nav
      aria-label="Nawigacja między lekcjami"
      className="mt-10 border-t border-zinc-800 pt-8"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          {previousLesson ? (
            <Link
              href={`/courses/${courseSlug}/${previousLesson.slug}`}
              className="group flex h-full cursor-pointer flex-col rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4 transition-colors hover:bg-zinc-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              <span className="text-sm text-zinc-500">
                ← Poprzednia lekcja
              </span>

              <span className="mt-1 font-medium text-zinc-200 group-hover:text-white">
                {previousLesson.title}
              </span>
            </Link>
          ) : (
            <div className="h-full rounded-xl border border-zinc-900 bg-zinc-950/40 px-5 py-4 opacity-50">
              <span className="text-sm text-zinc-600">
                To pierwsza lekcja
              </span>
            </div>
          )}
        </div>

        <Link
          href={`/courses/${courseSlug}`}
          className="flex cursor-pointer items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-center font-medium transition-colors hover:bg-zinc-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          Powrót do kursu
        </Link>

        <div>
          {nextLesson ? (
            <Link
              href={`/courses/${courseSlug}/${nextLesson.slug}`}
              className="group flex h-full cursor-pointer flex-col items-end rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-right transition-colors hover:bg-zinc-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              <span className="text-sm text-zinc-500">
                Następna lekcja →
              </span>

              <span className="mt-1 font-medium text-zinc-200 group-hover:text-white">
                {nextLesson.title}
              </span>
            </Link>
          ) : (
            <div className="h-full rounded-xl border border-zinc-900 bg-zinc-950/40 px-5 py-4 text-right opacity-50">
              <span className="text-sm text-zinc-600">
                To ostatnia lekcja
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}