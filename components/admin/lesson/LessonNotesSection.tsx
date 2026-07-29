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

import type { AdminLessonNote } from "./types";

type LessonNotesSectionProps = {
  notes: AdminLessonNote[];
  isSaving: boolean;
  onCreate: (input: {
    title: string;
    content: string;
  }) => Promise<boolean>;
  onUpdate: (input: {
    id: string;
    title: string;
    content: string;
    order: number;
  }) => Promise<boolean>;
  onDelete: (
    noteId: string,
  ) => Promise<boolean>;
};

type NoteDraft = {
  id: string;
  title: string;
  content: string;
  order: number;
};

export default function LessonNotesSection({
  notes,
  isSaving,
  onCreate,
  onUpdate,
  onDelete,
}: LessonNotesSectionProps) {
  const [title, setTitle] =
    useState("");

  const [content, setContent] =
    useState("");

  const [draft, setDraft] =
    useState<NoteDraft | null>(null);

  async function handleCreate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const created = await onCreate({
      title,
      content,
    });

    if (created) {
      setTitle("");
      setContent("");
    }
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!draft) {
      return;
    }

    const updated = await onUpdate(draft);

    if (updated) {
      setDraft(null);
    }
  }

  async function handleDelete(
    noteId: string,
  ) {
    const confirmed = window.confirm(
      "Czy na pewno usunąć tę notatkę? Tej operacji nie można cofnąć.",
    );

    if (!confirmed) {
      return;
    }

    const deleted =
      await onDelete(noteId);

    if (
      deleted &&
      draft?.id === noteId
    ) {
      setDraft(null);
    }
  }

  return (
    <Surface className="p-6">
      <h2 className="text-xl font-semibold text-zinc-100">
        Notatki
      </h2>

      <div className="mt-5 space-y-4">
        {notes.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-700 p-5 text-sm text-zinc-400">
            Ta lekcja nie ma jeszcze żadnych
            notatek.
          </div>
        )}

        {notes.map((note) =>
          draft?.id === note.id ? (
            <form
              key={note.id}
              onSubmit={handleUpdate}
              className="rounded-xl border border-blue-500/40 bg-blue-500/5 p-4"
            >
              <h3 className="font-semibold text-blue-200">
                Edycja notatki
              </h3>

              <FormField
                htmlFor={`note-title-${note.id}`}
                label="Tytuł"
                className="mt-4"
              >
                <Input
                  id={`note-title-${note.id}`}
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      title:
                        event.target.value,
                    })
                  }
                  disabled={isSaving}
                />
              </FormField>

              <FormField
                htmlFor={`note-content-${note.id}`}
                label="Treść"
                className="mt-4"
              >
                <Textarea
                  id={`note-content-${note.id}`}
                  value={draft.content}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      content:
                        event.target.value,
                    })
                  }
                  rows={8}
                  disabled={isSaving}
                />
              </FormField>

              <FormField
                htmlFor={`note-order-${note.id}`}
                label="Kolejność"
                className="mt-4"
              >
                <Input
                  id={`note-order-${note.id}`}
                  type="number"
                  min={0}
                  value={draft.order}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      order: Number(
                        event.target.value,
                      ),
                    })
                  }
                  disabled={isSaving}
                />
              </FormField>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  type="submit"
                  disabled={
                    isSaving ||
                    !draft.title.trim()
                  }
                >
                  {isSaving
                    ? "Zapisywanie..."
                    : "Zapisz zmiany"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDraft(null)
                  }
                  disabled={isSaving}
                >
                  Anuluj
                </Button>
              </div>
            </form>
          ) : (
            <article
              key={note.id}
              className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-600">
                    Notatka{" "}
                    {note.order ?? 0}
                  </p>

                  <h3 className="mt-1 font-semibold text-zinc-100">
                    {note.title}
                  </h3>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        id: note.id,
                        title: note.title,
                        content:
                          note.content ?? "",
                        order:
                          note.order ?? 0,
                      })
                    }
                    disabled={isSaving}
                    className="text-sm text-blue-400 transition hover:text-blue-300 disabled:opacity-50"
                  >
                    Edytuj
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void handleDelete(
                        note.id,
                      )
                    }
                    disabled={isSaving}
                    className="text-sm text-red-400 transition hover:text-red-300 disabled:opacity-50"
                  >
                    Usuń
                  </button>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                {note.content}
              </p>
            </article>
          ),
        )}
      </div>

      <form
        onSubmit={handleCreate}
        className="mt-6 border-t border-zinc-800 pt-6"
      >
        <h3 className="font-semibold text-zinc-200">
          Dodaj notatkę
        </h3>

        <FormField
          htmlFor="new-note-title"
          label="Tytuł"
          className="mt-4"
        >
          <Input
            id="new-note-title"
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            disabled={isSaving}
          />
        </FormField>

        <FormField
          htmlFor="new-note-content"
          label="Treść"
          className="mt-4"
        >
          <Textarea
            id="new-note-content"
            value={content}
            onChange={(event) =>
              setContent(
                event.target.value,
              )
            }
            rows={7}
            disabled={isSaving}
          />
        </FormField>

        <Button
          type="submit"
          fullWidth
          className="mt-4"
          disabled={
            isSaving || !title.trim()
          }
        >
          Dodaj notatkę
        </Button>
      </form>
    </Surface>
  );
}
