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

export type CreateModuleInput = {
  title: string;
  description: string;
};

type ModuleCreateFormProps = {
  isSaving: boolean;
  onCreate: (
    input: CreateModuleInput,
  ) => Promise<boolean>;
};

export default function ModuleCreateForm({
  isSaving,
  onCreate,
}: ModuleCreateFormProps) {
  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const created = await onCreate({
      title,
      description,
    });

    if (created) {
      setTitle("");
      setDescription("");
    }
  }

  return (
    <Surface className="h-fit p-6">
      <h2 className="text-xl font-semibold text-zinc-100">
        Dodaj moduł
      </h2>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5"
      >
        <FormField
          htmlFor="new-module-title"
          label="Nazwa modułu"
        >
          <Input
            id="new-module-title"
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            disabled={isSaving}
            required
          />
        </FormField>

        <FormField
          htmlFor="new-module-description"
          label="Opis modułu"
        >
          <Textarea
            id="new-module-description"
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

        <Button
          type="submit"
          fullWidth
          disabled={
            isSaving || !title.trim()
          }
        >
          {isSaving
            ? "Tworzenie..."
            : "Dodaj moduł"}
        </Button>
      </form>
    </Surface>
  );
}
