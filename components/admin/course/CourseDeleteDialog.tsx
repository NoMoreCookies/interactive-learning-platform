"use client";

import {
  useState,
} from "react";

import type {
  AdminCourseListItem,
} from "./types";

type CourseDeleteDialogProps = {
  course: AdminCourseListItem;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (
    courseId: string,
    confirmationSlug: string,
  ) => Promise<boolean>;
};

export default function CourseDeleteDialog({
  course,
  isDeleting,
  onClose,
  onConfirm,
}: CourseDeleteDialogProps) {
  const [
    confirmationSlug,
    setConfirmationSlug,
  ] =
    useState("");

  const isConfirmed =
    confirmationSlug.trim() ===
    course.slug;

  async function handleDelete() {
    if (
      !isConfirmed ||
      isDeleting
    ) {
      return;
    }

    const deleted =
      await onConfirm(
        course.id,
        confirmationSlug.trim(),
      );

    if (deleted) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-course-title"
      aria-describedby="delete-course-description"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !isDeleting
        ) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (
          event.key === "Escape" &&
          !isDeleting
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-red-900/60 bg-zinc-950 p-6 shadow-2xl">
        <h2
          id="delete-course-title"
          className="text-xl font-semibold text-zinc-100"
        >
          Usuń kurs
        </h2>

        <p
          id="delete-course-description"
          className="mt-3 text-sm leading-6 text-zinc-400"
        >
          Ta operacja usunie kurs oraz jego
          moduły, lekcje, notatki i zadania.
          Operacja jest wykonywana po stronie
          backendu.
        </p>

        <div className="mt-5 rounded-xl border border-red-900/40 bg-red-950/20 p-4">
          <p className="font-medium text-zinc-100">
            {course.title}
          </p>

          <p className="mt-2 text-sm text-zinc-400">
            Aby potwierdzić, wpisz dokładnie:
          </p>

          <code className="mt-2 block break-all rounded-lg bg-black/30 px-3 py-2 text-sm text-red-200">
            {course.slug}
          </code>
        </div>

        <label
          htmlFor="delete-course-confirmation"
          className="mt-5 block text-sm font-medium text-zinc-300"
        >
          Slug kursu
        </label>

        <input
          id="delete-course-confirmation"
          type="text"
          autoComplete="off"
          autoFocus
          value={confirmationSlug}
          disabled={isDeleting}
          onChange={(event) =>
            setConfirmationSlug(
              event.target.value,
            )
          }
          className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Anuluj
          </button>

          <button
            type="button"
            disabled={
              !isConfirmed ||
              isDeleting
            }
            onClick={() => {
              void handleDelete();
            }}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-950 disabled:text-red-400"
          >
            {isDeleting
              ? "Usuwanie..."
              : "Usuń kurs"}
          </button>
        </div>
      </div>
    </div>
  );
}
