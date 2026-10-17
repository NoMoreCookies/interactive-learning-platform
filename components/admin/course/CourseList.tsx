"use client";

import Link from "next/link";
import {
  useState,
} from "react";

import {
  getCourseLevelLabel,
  getCourseSubjectLabel,
} from "@/lib/utils/course-values";

import CourseDeleteDialog from "./CourseDeleteDialog";

import type {
  AdminCourseListItem,
} from "./types";

type CourseListProps = {
  courses: AdminCourseListItem[];
  isLoading: boolean;
  deletingCourseId: string | null;
  onDelete: (
    courseId: string,
    confirmationSlug: string,
  ) => Promise<boolean>;
};

export default function CourseList({
  courses,
  isLoading,
  deletingCourseId,
  onDelete,
}: CourseListProps) {
  const [
    courseToDelete,
    setCourseToDelete,
  ] =
    useState<
      AdminCourseListItem | null
    >(null);

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
    <>
      <div className="space-y-4">
        {courses.map((course) => {
          const published =
            course.published ?? false;

          const isDeleting =
            deletingCourseId ===
            course.id;

          return (
            <article
              key={course.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/60 transition-all hover:border-zinc-600"
            >
              <Link
                href={`/admin/courses/${course.id}`}
                className="block rounded-t-2xl p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
                      published
                    }
                  />
                </div>
              </Link>

              <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-4">
                <span className="text-xs text-zinc-600">
                  {published
                    ? "Najpierw wycofaj kurs z publikacji, aby go usunąć."
                    : "Kurs może zostać bezpiecznie usunięty."}
                </span>

                <button
                  type="button"
                  disabled={
                    published ||
                    isDeleting
                  }
                  onClick={() =>
                    setCourseToDelete(
                      course,
                    )
                  }
                  className="rounded-lg border border-red-900/60 px-3 py-2 text-sm font-medium text-red-300 transition hover:border-red-700 hover:bg-red-950/30 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600 disabled:hover:bg-transparent"
                >
                  {isDeleting
                    ? "Usuwanie..."
                    : "Usuń"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {courseToDelete && (
        <CourseDeleteDialog
          course={courseToDelete}
          isDeleting={
            deletingCourseId ===
            courseToDelete.id
          }
          onClose={() =>
            setCourseToDelete(
              null,
            )
          }
          onConfirm={onDelete}
        />
      )}
    </>
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
