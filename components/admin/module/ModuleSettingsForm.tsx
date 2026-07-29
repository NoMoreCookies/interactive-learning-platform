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

import type { AdminModule } from "./types";

type ModuleSettingsFormProps = {
  courseModule: AdminModule;
  isSaving: boolean;
  onModuleChange: Dispatch<
    SetStateAction<AdminModule | null>
  >;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
};

export default function ModuleSettingsForm({
  courseModule,
  isSaving,
  onModuleChange,
  onSubmit,
}: ModuleSettingsFormProps) {
  function updateModule(
    changes: Partial<AdminModule>,
  ) {
    onModuleChange((currentModule) =>
      currentModule
        ? {
            ...currentModule,
            ...changes,
          }
        : currentModule,
    );
  }

  return (
    <Surface className="p-6">
      <form onSubmit={onSubmit}>
        <h2 className="text-xl font-semibold text-zinc-100">
          Ustawienia modułu
        </h2>

        <div className="mt-6 space-y-5">
          <FormField
            htmlFor="module-title"
            label="Nazwa modułu"
          >
            <Input
              id="module-title"
              value={courseModule.title}
              onChange={(event) =>
                updateModule({
                  title: event.target.value,
                })
              }
              disabled={isSaving}
              required
            />
          </FormField>

          <FormField
            htmlFor="module-slug"
            label="Slug"
          >
            <Input
              id="module-slug"
              value={courseModule.slug}
              onChange={(event) =>
                updateModule({
                  slug: event.target.value,
                })
              }
              disabled={isSaving}
              required
            />
          </FormField>

          <FormField
            htmlFor="module-order"
            label="Kolejność"
          >
            <Input
              id="module-order"
              type="number"
              min={0}
              value={
                courseModule.order ?? 0
              }
              onChange={(event) =>
                updateModule({
                  order: Number(
                    event.target.value,
                  ),
                })
              }
              disabled={isSaving}
            />
          </FormField>

          <FormField
            htmlFor="module-description"
            label="Opis"
          >
            <Textarea
              id="module-description"
              value={
                courseModule.description ??
                ""
              }
              onChange={(event) =>
                updateModule({
                  description:
                    event.target.value,
                })
              }
              rows={5}
              disabled={isSaving}
            />
          </FormField>
        </div>

        <label className="mt-5 flex items-center gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={
              courseModule.published ??
              false
            }
            onChange={(event) =>
              updateModule({
                published:
                  event.target.checked,
              })
            }
            disabled={isSaving}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-blue-600"
          />

          Moduł opublikowany
        </label>

        <Button
          type="submit"
          className="mt-6"
          disabled={
            isSaving ||
            !courseModule.title.trim() ||
            !courseModule.slug.trim()
          }
        >
          {isSaving
            ? "Zapisywanie..."
            : "Zapisz moduł"}
        </Button>
      </form>
    </Surface>
  );
}
