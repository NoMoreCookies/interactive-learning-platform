import Link from "next/link";

import type { AdminCourseModule } from "./types";

type CourseModulesListProps = {
  modules: AdminCourseModule[];
};

export default function CourseModulesList({
  modules,
}: CourseModulesListProps) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-zinc-100">
        Moduły
      </h2>

      <div className="mt-5 space-y-4">
        {modules.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-zinc-400">
            Ten kurs nie ma jeszcze modułów.
          </div>
        )}

        {modules.map((courseModule) => (
          <Link
            key={courseModule.id}
            href={`/admin/modules/${courseModule.id}`}
            className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 transition-all hover:-translate-y-0.5 hover:border-zinc-600 hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div>
              <p className="text-sm text-zinc-500">
                Moduł{" "}
                {courseModule.order ?? 0}
              </p>

              <h3 className="mt-1 text-lg font-semibold text-zinc-100">
                {courseModule.title}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={[
                  "rounded-full px-3 py-1 text-xs",
                  courseModule.published
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-amber-500/10 text-amber-300",
                ].join(" ")}
              >
                {courseModule.published
                  ? "Opublikowany"
                  : "Szkic"}
              </span>

              <span className="text-sm text-zinc-400">
                Edytuj →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
