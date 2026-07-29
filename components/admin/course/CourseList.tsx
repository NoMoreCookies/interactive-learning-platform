import Link from "next/link";

import {
  getCourseLevelLabel,
  getCourseSubjectLabel,
} from "@/lib/utils/course-values";

import type { AdminCourseListItem } from "./types";

type CourseListProps = {
  courses: AdminCourseListItem[];
  isLoading: boolean;
};

export default function CourseList({
  courses,
  isLoading,
}: CourseListProps) {
  if (isLoading) {
    return (
      <p className="text-zinc-400">
        Pobieranie kursów...
      </p>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-zinc-400">
        Nie utworzono jeszcze żadnego
        kursu.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {courses.map((course) => (
        <Link
          key={course.id}
          href={`/admin/courses/${course.id}`}
          className="block rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 transition-all hover:-translate-y-0.5 hover:border-zinc-600 hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <h3 className="text-xl font-semibold text-zinc-100">
                {course.title}
              </h3>

              <p className="mt-2 text-sm text-zinc-400">
                {getCourseSubjectLabel(
                  course.subject,
                )}
                {" · "}
                {getCourseLevelLabel(
                  course.level,
                )}
              </p>

              {course.description && (
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-500">
                  {course.description}
                </p>
              )}
            </div>

            <PublicationBadge
              published={
                course.published ?? false
              }
            />
          </div>
        </Link>
      ))}
    </div>
  );
}

function PublicationBadge({
  published,
}: {
  published: boolean;
}) {
  return (
    <span
      className={[
        "shrink-0 rounded-full px-3 py-1 text-xs",
        published
          ? "bg-emerald-500/10 text-emerald-300"
          : "bg-amber-500/10 text-amber-300",
      ].join(" ")}
    >
      {published
        ? "Opublikowany"
        : "Szkic"}
    </span>
  );
}
