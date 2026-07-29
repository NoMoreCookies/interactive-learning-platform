import Link from "next/link";

import type { AdminModuleLesson } from "./types";

type ModuleLessonsListProps = {
  lessons: AdminModuleLesson[];
};

export default function ModuleLessonsList({
  lessons,
}: ModuleLessonsListProps) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-zinc-100">
        Lekcje
      </h2>

      <div className="mt-5 space-y-4">
        {lessons.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-zinc-400">
            Ten moduł nie ma jeszcze lekcji.
          </div>
        )}

        {lessons.map((lesson) => (
          <Link
            key={lesson.id}
            href={`/admin/lessons/${lesson.id}`}
            className="block rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 transition-all hover:-translate-y-0.5 hover:border-zinc-600 hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500">
                  Lekcja{" "}
                  {lesson.order ?? 0}
                </p>

                <h3 className="mt-1 text-lg font-semibold text-zinc-100">
                  {lesson.title}
                </h3>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <ReadinessBadge
                  label="Film"
                  ready={Boolean(
                    lesson.videoPath,
                  )}
                />

                <ReadinessBadge
                  label="Materiały"
                  ready={Boolean(
                    lesson.materialsPath,
                  )}
                />

                <span
                  className={[
                    "rounded-full px-3 py-1",
                    lesson.published
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-amber-500/10 text-amber-300",
                  ].join(" ")}
                >
                  {lesson.published
                    ? "Opublikowana"
                    : "Szkic"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ReadinessBadge({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <span
      className={[
        "rounded-full px-3 py-1",
        ready
          ? "bg-emerald-500/10 text-emerald-300"
          : "bg-red-500/10 text-red-300",
      ].join(" ")}
    >
      {label}
    </span>
  );
}
