"use client";

import {
  type FormEvent,
  useState,
} from "react";

import {
  Button,
  FormField,
  Input,
  Surface,
  Textarea,
} from "@/components/ui";

export type CreateLessonInput = {
  title: string;
  description: string;
  durationMinutes: number;
};

type LessonCreateFormProps = {
  isSaving: boolean;
  onCreate: (
    input: CreateLessonInput,
  ) => Promise<boolean>;
};

export default function LessonCreateForm({
  isSaving,
  onCreate,
}: LessonCreateFormProps) {
  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [
    durationMinutes,
    setDurationMinutes,
  ] = useState(30);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const created = await onCreate({
      title,
      description,
      durationMinutes,
    });

    if (!created) {
      return;
    }

    setTitle("");
    setDescription("");
    setDurationMinutes(30);
  }

  return (
    <Surface className="h-fit p-6">
      <h2 className="text-xl font-semibold text-zinc-100">
        Dodaj lekcję
      </h2>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5"
      >
        <FormField
          htmlFor="new-lesson-title"
          label="Nazwa lekcji"
        >
          <Input
            id="new-lesson-title"
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            disabled={isSaving}
            required
          />
        </FormField>

        <FormField
          htmlFor="new-lesson-description"
          label="Opis lekcji"
        >
          <Textarea
            id="new-lesson-description"
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            disabled={isSaving}
            rows={5}
          />
        </FormField>

        <FormField
          htmlFor="new-lesson-duration"
          label="Czas trwania w minutach"
        >
          <Input
            id="new-lesson-duration"
            type="number"
            min={0}
            value={durationMinutes}
            onChange={(event) =>
              setDurationMinutes(
                Number(event.target.value),
              )
            }
            disabled={isSaving}
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
            : "Dodaj lekcję"}
        </Button>
      </form>
    </Surface>
  );
}
