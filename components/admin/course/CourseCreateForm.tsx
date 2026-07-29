"use client";

import {
  type FormEvent,
  useState,
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

export type CreateCourseInput = {
  title: string;
  description: string;
  subject: CourseSubject;
  level: CourseLevel;
};

type CourseCreateFormProps = {
  isSaving: boolean;
  onCreate: (
    input: CreateCourseInput,
  ) => Promise<boolean>;
};

const DEFAULT_SUBJECT: CourseSubject =
  "MATHEMATICS";

const DEFAULT_LEVEL: CourseLevel =
  "EXTENDED";

export default function CourseCreateForm({
  isSaving,
  onCreate,
}: CourseCreateFormProps) {
  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [subject, setSubject] =
    useState<CourseSubject>(
      DEFAULT_SUBJECT,
    );

  const [level, setLevel] =
    useState<CourseLevel>(DEFAULT_LEVEL);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const created = await onCreate({
      title,
      description,
      subject,
      level,
    });

    if (!created) {
      return;
    }

    setTitle("");
    setDescription("");
    setSubject(DEFAULT_SUBJECT);
    setLevel(DEFAULT_LEVEL);
  }

  return (
    <Surface className="h-fit p-6">
      <h2 className="text-xl font-semibold text-zinc-100">
        Dodaj kurs
      </h2>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5"
      >
        <FormField
          htmlFor="new-course-title"
          label="Nazwa kursu"
        >
          <Input
            id="new-course-title"
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            disabled={isSaving}
            placeholder="Matematyka rozszerzona"
            required
          />
        </FormField>

        <FormField
          htmlFor="new-course-subject"
          label="Przedmiot"
        >
          <Select
            id="new-course-subject"
            value={subject}
            onChange={(event) =>
              setSubject(
                event.target
                  .value as CourseSubject,
              )
            }
            disabled={isSaving}
          >
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
          htmlFor="new-course-level"
          label="Poziom"
        >
          <Select
            id="new-course-level"
            value={level}
            onChange={(event) =>
              setLevel(
                event.target
                  .value as CourseLevel,
              )
            }
            disabled={isSaving}
          >
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
          htmlFor="new-course-description"
          label="Opis"
        >
          <Textarea
            id="new-course-description"
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            disabled={isSaving}
            rows={5}
            placeholder="Krótki opis kursu..."
          />
        </FormField>

        <Button
          type="submit"
          fullWidth
          disabled={
            isSaving || !title.trim()
          }
        >
          {isSaving
            ? "Tworzenie..."
            : "Utwórz kurs"}
        </Button>
      </form>
    </Surface>
  );
}
