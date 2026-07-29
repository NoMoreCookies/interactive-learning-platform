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

import type { AdminLessonTask } from "./types";

type TaskInput = {
  title: string;
  content: string;
  answer: string;
  solution: string;
};

type TaskDraft = TaskInput & {
  id: string;
  order: number;
};

type LessonTasksSectionProps = {
  tasks: AdminLessonTask[];
  isSaving: boolean;
  onCreate: (
    input: TaskInput,
  ) => Promise<boolean>;
  onUpdate: (
    input: TaskDraft,
  ) => Promise<boolean>;
  onDelete: (
    taskId: string,
  ) => Promise<boolean>;
};

const emptyTaskInput: TaskInput = {
  title: "",
  content: "",
  answer: "",
  solution: "",
};

export default function LessonTasksSection({
  tasks,
  isSaving,
  onCreate,
  onUpdate,
  onDelete,
}: LessonTasksSectionProps) {
  const [newTask, setNewTask] =
    useState<TaskInput>(emptyTaskInput);

  const [draft, setDraft] =
    useState<TaskDraft | null>(null);

  async function handleCreate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const created =
      await onCreate(newTask);

    if (created) {
      setNewTask(emptyTaskInput);
    }
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!draft) {
      return;
    }

    const updated =
      await onUpdate(draft);

    if (updated) {
      setDraft(null);
    }
  }

  async function handleDelete(
    taskId: string,
  ) {
    const confirmed = window.confirm(
      "Czy na pewno usunąć to zadanie? Tej operacji nie można cofnąć.",
    );

    if (!confirmed) {
      return;
    }

    const deleted =
      await onDelete(taskId);

    if (
      deleted &&
      draft?.id === taskId
    ) {
      setDraft(null);
    }
  }

  return (
    <Surface className="p-6">
      <h2 className="text-xl font-semibold text-zinc-100">
        Zadania
      </h2>

      <div className="mt-5 space-y-4">
        {tasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-700 p-5 text-sm text-zinc-400">
            Ta lekcja nie ma jeszcze żadnych
            zadań.
          </div>
        )}

        {tasks.map((task) =>
          draft?.id === task.id ? (
            <TaskEditForm
              key={task.id}
              draft={draft}
              isSaving={isSaving}
              onDraftChange={setDraft}
              onSubmit={handleUpdate}
              onCancel={() =>
                setDraft(null)
              }
            />
          ) : (
            <TaskCard
              key={task.id}
              task={task}
              isSaving={isSaving}
              onEdit={() =>
                setDraft({
                  id: task.id,
                  title: task.title,
                  content:
                    task.content ?? "",
                  answer:
                    task.answer ?? "",
                  solution:
                    task.solution ?? "",
                  order:
                    task.order ?? 0,
                })
              }
              onDelete={() =>
                void handleDelete(
                  task.id,
                )
              }
            />
          ),
        )}
      </div>

      <form
        onSubmit={handleCreate}
        className="mt-6 border-t border-zinc-800 pt-6"
      >
        <h3 className="font-semibold text-zinc-200">
          Dodaj zadanie
        </h3>

        <TaskFields
          prefix="new-task"
          value={newTask}
          disabled={isSaving}
          onChange={setNewTask}
        />

        <Button
          type="submit"
          fullWidth
          className="mt-4"
          disabled={
            isSaving ||
            !newTask.title.trim()
          }
        >
          Dodaj zadanie
        </Button>
      </form>
    </Surface>
  );
}

type TaskEditFormProps = {
  draft: TaskDraft;
  isSaving: boolean;
  onDraftChange: (
    draft: TaskDraft,
  ) => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
  onCancel: () => void;
};

function TaskEditForm({
  draft,
  isSaving,
  onDraftChange,
  onSubmit,
  onCancel,
}: TaskEditFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-blue-500/40 bg-blue-500/5 p-4"
    >
      <h3 className="font-semibold text-blue-200">
        Edycja zadania
      </h3>

      <TaskFields
        prefix={`task-${draft.id}`}
        value={draft}
        disabled={isSaving}
        onChange={(value) =>
          onDraftChange({
            ...draft,
            ...value,
          })
        }
      />

      <FormField
        htmlFor={`task-order-${draft.id}`}
        label="Kolejność"
        className="mt-4"
      >
        <Input
          id={`task-order-${draft.id}`}
          type="number"
          min={0}
          value={draft.order}
          onChange={(event) =>
            onDraftChange({
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
          onClick={onCancel}
          disabled={isSaving}
        >
          Anuluj
        </Button>
      </div>
    </form>
  );
}

type TaskFieldsProps = {
  prefix: string;
  value: TaskInput;
  disabled: boolean;
  onChange: (
    value: TaskInput,
  ) => void;
};

function TaskFields({
  prefix,
  value,
  disabled,
  onChange,
}: TaskFieldsProps) {
  return (
    <>
      <FormField
        htmlFor={`${prefix}-title`}
        label="Tytuł"
        className="mt-4"
      >
        <Input
          id={`${prefix}-title`}
          value={value.title}
          onChange={(event) =>
            onChange({
              ...value,
              title:
                event.target.value,
            })
          }
          disabled={disabled}
        />
      </FormField>

      <FormField
        htmlFor={`${prefix}-content`}
        label="Treść zadania"
        className="mt-4"
      >
        <Textarea
          id={`${prefix}-content`}
          value={value.content}
          onChange={(event) =>
            onChange({
              ...value,
              content:
                event.target.value,
            })
          }
          rows={6}
          disabled={disabled}
        />
      </FormField>

      <FormField
        htmlFor={`${prefix}-answer`}
        label="Odpowiedź"
        className="mt-4"
      >
        <Input
          id={`${prefix}-answer`}
          value={value.answer}
          onChange={(event) =>
            onChange({
              ...value,
              answer:
                event.target.value,
            })
          }
          disabled={disabled}
        />
      </FormField>

      <FormField
        htmlFor={`${prefix}-solution`}
        label="Pełne rozwiązanie"
        className="mt-4"
      >
        <Textarea
          id={`${prefix}-solution`}
          value={value.solution}
          onChange={(event) =>
            onChange({
              ...value,
              solution:
                event.target.value,
            })
          }
          rows={8}
          disabled={disabled}
        />
      </FormField>
    </>
  );
}

type TaskCardProps = {
  task: AdminLessonTask;
  isSaving: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function TaskCard({
  task,
  isSaving,
  onEdit,
  onDelete,
}: TaskCardProps) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-600">
            Zadanie {task.order ?? 0}
          </p>

          <h3 className="mt-1 font-semibold text-zinc-100">
            {task.title}
          </h3>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onEdit}
            disabled={isSaving}
            className="text-sm text-blue-400 transition hover:text-blue-300 disabled:opacity-50"
          >
            Edytuj
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={isSaving}
            className="text-sm text-red-400 transition hover:text-red-300 disabled:opacity-50"
          >
            Usuń
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <TaskValue
          label="Treść"
          value={task.content}
        />

        <TaskValue
          label="Odpowiedź"
          value={
            task.answer ||
            "Brak odpowiedzi"
          }
          contained
        />

        <TaskValue
          label="Rozwiązanie"
          value={
            task.solution ||
            "Brak rozwiązania"
          }
          contained
        />
      </div>
    </article>
  );
}

function TaskValue({
  label,
  value,
  contained = false,
}: {
  label: string;
  value: string | null | undefined;
  contained?: boolean;
}) {
  return (
    <div
      className={
        contained
          ? "rounded-lg border border-zinc-800 bg-zinc-950 p-3"
          : undefined
      }
    >
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
        {value}
      </p>
    </div>
  );
}
