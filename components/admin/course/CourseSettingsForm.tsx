"use client";

import type {
  Dispatch,
  FormEvent,
  SetStateAction,
} from "react";

import {
  COURSE_LEVEL_OPTIONS,
  COURSE_SUBJECT_OPTIONS,
} from "@/lib/config/course-options";

import type {
  CourseLevel,
  CourseSubject,
} from "@/lib/services/admin-service";

import {
  Button,
  FormField,
  Input,
  Select,
  Surface,
  Textarea,
} from "@/components/ui";

import type { AdminCourse } from "./types";

type CourseSettingsFormProps = {
  course: AdminCourse;
  isSaving: boolean;
  onCourseChange: Dispatch<
    SetStateAction<AdminCourse | null>
  >;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
};

export default function CourseSettingsForm({
  course,
  isSaving,
  onCourseChange,
  onSubmit,
}: CourseSettingsFormProps) {
  function updateCourse(
    changes: Partial<AdminCourse>,
  ) {
    onCourseChange((currentCourse) =>
      currentCourse
        ? {
            ...currentCourse,
            ...changes,
          }
        : currentCourse,
    );
  }

  return (
    <Surface className="p-6">
      <form onSubmit={onSubmit}>
        <h2 className="text-xl font-semibold text-zinc-100">
          Ustawienia kursu
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <FormField
            htmlFor="course-title"
            label="Nazwa kursu"
          >
            <Input
              id="course-title"
              value={course.title}
              onChange={(event) =>
                updateCourse({
                  title: event.target.value,
                })
              }
              disabled={isSaving}
              required
            />
          </FormField>

          <FormField
            htmlFor="course-slug"
            label="Slug"
          >
            <Input
              id="course-slug"
              value={course.slug}
              onChange={(event) =>
                updateCourse({
                  slug: event.target.value,
                })
              }
              disabled={isSaving}
              required
            />
          </FormField>

          <FormField
            htmlFor="course-subject"
            label="Przedmiot"
          >
            <Select
              id="course-subject"
              value={course.subject ?? ""}
              onChange={(event) =>
                updateCourse({
                  subject:
                    event.target.value === ""
                      ? null
                      : (event.target
                          .value as CourseSubject),
                })
              }
              disabled={isSaving}
            >
              <option value="">
                Wybierz przedmiot
              </option>

              {COURSE_SUBJECT_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </Select>
          </FormField>

          <FormField
            htmlFor="course-level"
            label="Poziom"
          >
            <Select
              id="course-level"
              value={course.level ?? ""}
              onChange={(event) =>
                updateCourse({
                  level:
                    event.target.value === ""
                      ? null
                      : (event.target
                          .value as CourseLevel),
                })
              }
              disabled={isSaving}
            >
              <option value="">
                Wybierz poziom
              </option>

              {COURSE_LEVEL_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </Select>
          </FormField>

          <FormField
            htmlFor="course-order"
            label="Kolejność"
          >
            <Input
              id="course-order"
              type="number"
              min={0}
              value={course.order ?? 0}
              onChange={(event) =>
                updateCourse({
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
          htmlFor="course-description"
          label="Opis"
          className="mt-5"
        >
          <Textarea
            id="course-description"
            value={course.description ?? ""}
            onChange={(event) =>
              updateCourse({
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
              course.published ?? false
            }
            onChange={(event) =>
              updateCourse({
                published:
                  event.target.checked,
              })
            }
            disabled={isSaving}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-blue-600"
          />

          Kurs opublikowany
        </label>

        <Button
          type="submit"
          className="mt-6"
          disabled={
            isSaving ||
            !course.title.trim() ||
            !course.slug.trim()
          }
        >
          {isSaving
            ? "Zapisywanie..."
            : "Zapisz kurs"}
        </Button>
      </form>
    </Surface>
  );
}
