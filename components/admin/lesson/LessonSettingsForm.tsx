"use client";

import type {
  Dispatch,
  FormEvent,
  SetStateAction,
} from "react";

import {
  Button,
  FormField,
  Input,
  Surface,
  Textarea,
} from "@/components/ui";

import type { AdminLesson } from "./types";

type LessonSettingsFormProps = {
  lesson: AdminLesson;
  isSaving: boolean;
  onLessonChange: Dispatch<
    SetStateAction<AdminLesson | null>
  >;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
};

export default function LessonSettingsForm({
  lesson,
  isSaving,
  onLessonChange,
  onSubmit,
}: LessonSettingsFormProps) {
  function updateLesson(
    changes: Partial<AdminLesson>,
  ) {
    onLessonChange((currentLesson) =>
      currentLesson
        ? {
            ...currentLesson,
            ...changes,
          }
        : currentLesson,
    );
  }

  return (
    <Surface className="p-6">
      <form onSubmit={onSubmit}>
        <h2 className="text-xl font-semibold text-zinc-100">
          Ustawienia lekcji
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <FormField
            htmlFor="lesson-title"
            label="Tytuł"
          >
            <Input
              id="lesson-title"
              value={lesson.title}
              onChange={(event) =>
                updateLesson({
                  title: event.target.value,
                })
              }
              disabled={isSaving}
              required
            />
          </FormField>

          <FormField
            htmlFor="lesson-slug"
            label="Slug"
          >
            <Input
              id="lesson-slug"
              value={lesson.slug}
              onChange={(event) =>
                updateLesson({
                  slug: event.target.value,
                })
              }
              disabled={isSaving}
              required
            />
          </FormField>

          <FormField
            htmlFor="lesson-duration"
            label="Czas trwania w minutach"
          >
            <Input
              id="lesson-duration"
              type="number"
              min={0}
              value={
                lesson.durationMinutes ?? 0
              }
              onChange={(event) =>
                updateLesson({
                  durationMinutes: Number(
                    event.target.value,
                  ),
                })
              }
              disabled={isSaving}
            />
          </FormField>

          <FormField
            htmlFor="lesson-order"
            label="Kolejność"
          >
            <Input
              id="lesson-order"
              type="number"
              min={0}
              value={lesson.order ?? 0}
              onChange={(event) =>
                updateLesson({
                  order: Number(
                    event.target.value,
                  ),
                })
              }
              disabled={isSaving}
            />
          </FormField>
        </div>

        <FormField
          htmlFor="lesson-description"
          label="Opis"
          className="mt-5"
        >
          <Textarea
            id="lesson-description"
            value={lesson.description ?? ""}
            onChange={(event) =>
              updateLesson({
                description:
                  event.target.value,
              })
            }
            rows={5}
            disabled={isSaving}
          />
        </FormField>

        <label className="mt-5 flex items-center gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={
              lesson.published ?? false
            }
            onChange={(event) =>
              updateLesson({
                published:
                  event.target.checked,
              })
            }
            disabled={isSaving}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-blue-600"
          />

          Lekcja opublikowana
        </label>

        <Button
          type="submit"
          className="mt-6"
          disabled={
            isSaving ||
            !lesson.title.trim() ||
            !lesson.slug.trim()
          }
        >
          {isSaving
            ? "Zapisywanie..."
            : "Zapisz ustawienia"}
        </Button>
      </form>
    </Surface>
  );
}
