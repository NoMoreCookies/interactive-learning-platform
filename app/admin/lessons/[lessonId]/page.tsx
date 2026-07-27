"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import LessonAssetUploader from "@/components/admin/LessonAssetUploader";

import {
  createAdminLessonNote,
  createAdminLessonTask,
  deleteAdminLessonNote,
  deleteAdminLessonTask,
  getAdminCourse,
  getAdminLesson,
  getAdminLessonNotes,
  getAdminLessonTasks,
  getAdminModule,
  updateAdminLesson,
  updateAdminLessonNote,
  updateAdminLessonTask,
} from "@/lib/services/admin-service";

import {
  updateLessonMaterialsPath,
  updateLessonVideoPath,
} from "@/lib/services/lesson-service";

type Lesson = NonNullable<
  Awaited<ReturnType<typeof getAdminLesson>>
>;

type LessonNote = Awaited<
  ReturnType<typeof getAdminLessonNotes>
>[number];

type LessonTask = Awaited<
  ReturnType<typeof getAdminLessonTasks>
>[number];

type Module = NonNullable<
  Awaited<ReturnType<typeof getAdminModule>>
>;

type Course = NonNullable<
  Awaited<ReturnType<typeof getAdminCourse>>
>;

export default function AdminLessonPage() {
  const params = useParams<{
    lessonId: string;
  }>();

  const lessonId = params.lessonId;
  const [editingNoteId, setEditingNoteId] =
    useState<string | null>(null);

  const [editingNoteTitle, setEditingNoteTitle] =
    useState("");

  const [editingNoteContent, setEditingNoteContent] =
    useState("");

  const [editingNoteOrder, setEditingNoteOrder] =
    useState(0);

  const [editingTaskId, setEditingTaskId] =
    useState<string | null>(null);

  const [editingTaskTitle, setEditingTaskTitle] =
    useState("");

  const [editingTaskContent, setEditingTaskContent] =
    useState("");

  const [editingTaskAnswer, setEditingTaskAnswer] =
    useState("");

  const [editingTaskSolution, setEditingTaskSolution] =
    useState("");

  const [editingTaskOrder, setEditingTaskOrder] =
    useState(0);
  const [lesson, setLesson] =
    useState<Lesson | null>(null);

  const [courseModule, setCourseModule] =
    useState<Module | null>(null);

  const [course, setCourse] =
    useState<Course | null>(null);

  const [notes, setNotes] =
    useState<LessonNote[]>([]);

  const [tasks, setTasks] =
    useState<LessonTask[]>([]);

  const [noteTitle, setNoteTitle] =
    useState("");

  const [noteContent, setNoteContent] =
    useState("");

  const [taskTitle, setTaskTitle] =
    useState("");

  const [taskContent, setTaskContent] =
    useState("");

  const [taskAnswer, setTaskAnswer] =
    useState("");

  const [taskSolution, setTaskSolution] =
    useState("");

  const [statusMessage, setStatusMessage] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  async function loadData() {
    setIsLoading(true);

    try {
      const lessonResult =
        await getAdminLesson(lessonId);

      if (!lessonResult) {
        setLesson(null);
        return;
      }

      const [
        moduleResult,
        notesResult,
        tasksResult,
      ] = await Promise.all([
        getAdminModule(lessonResult.moduleId),
        getAdminLessonNotes(lessonId),
        getAdminLessonTasks(lessonId),
      ]);

      let courseResult: Course | null = null;

      if (moduleResult) {
        courseResult =
          await getAdminCourse(
            moduleResult.courseId,
          );
      }

      setLesson(lessonResult);
      setCourseModule(moduleResult);
      setCourse(courseResult);
      setNotes(notesResult);
      setTasks(tasksResult);
    } catch (error) {
      console.error(error);

      setStatusMessage(
        "Nie udało się pobrać danych lekcji.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [lessonId]);

  async function handleSaveLesson(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!lesson) {
      return;
    }

    setIsSaving(true);

    try {
      await updateAdminLesson({
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description ?? "",
        durationMinutes:
          lesson.durationMinutes ?? 0,
        order: lesson.order ?? 0,
        published: lesson.published ?? false,
      });

      setStatusMessage(
        "Lekcja została zapisana.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nie udało się zapisać lekcji.";

      setStatusMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateNote(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!noteTitle.trim()) {
      setStatusMessage(
        "Podaj tytuł notatki.",
      );

      return;
    }

    setIsSaving(true);

    try {
      await createAdminLessonNote({
        lessonId,
        title: noteTitle.trim(),
        content: noteContent.trim(),
        order: notes.length + 1,
      });

      setNoteTitle("");
      setNoteContent("");

      setStatusMessage(
        "Notatka została dodana.",
      );

      await loadData();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nie udało się dodać notatki.";

      setStatusMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateTask(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!taskTitle.trim()) {
      setStatusMessage(
        "Podaj tytuł zadania.",
      );

      return;
    }

    setIsSaving(true);

    try {
      await createAdminLessonTask({
        lessonId,
        title: taskTitle.trim(),
        content: taskContent.trim(),
        answer: taskAnswer.trim(),
        solution: taskSolution.trim(),
        order: tasks.length + 1,
      });

      setTaskTitle("");
      setTaskContent("");
      setTaskAnswer("");
      setTaskSolution("");

      setStatusMessage(
        "Zadanie zostało dodane.",
      );

      await loadData();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nie udało się dodać zadania.";

      setStatusMessage(message);
    } finally {
      setIsSaving(false);
    }
  }
function handleStartEditingNote(
  note: LessonNote,
) {
  setEditingNoteId(note.id);
  setEditingNoteTitle(note.title);
  setEditingNoteContent(note.content ?? "");
  setEditingNoteOrder(note.order ?? 0);
  setStatusMessage("");
}

function handleCancelEditingNote() {
  setEditingNoteId(null);
  setEditingNoteTitle("");
  setEditingNoteContent("");
  setEditingNoteOrder(0);
}

async function handleSaveEditedNote(
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  if (!editingNoteId) {
    return;
  }

  if (!editingNoteTitle.trim()) {
    setStatusMessage(
      "Tytuł notatki nie może być pusty.",
    );

    return;
  }

  setIsSaving(true);
  setStatusMessage("");

  try {
    await updateAdminLessonNote({
      id: editingNoteId,
      title: editingNoteTitle.trim(),
      content: editingNoteContent.trim(),
      order: editingNoteOrder,
    });

    handleCancelEditingNote();

    setStatusMessage(
      "Notatka została zaktualizowana.",
    );

    await loadData();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nie udało się zapisać notatki.";

    setStatusMessage(message);
  } finally {
    setIsSaving(false);
  }
}

async function handleDeleteNote(
  noteId: string,
) {
  const confirmed = window.confirm(
    "Czy na pewno usunąć tę notatkę? Tej operacji nie można cofnąć.",
  );

  if (!confirmed) {
    return;
  }

  setIsSaving(true);
  setStatusMessage("");

  try {
    await deleteAdminLessonNote(noteId);

    if (editingNoteId === noteId) {
      handleCancelEditingNote();
    }

    setStatusMessage(
      "Notatka została usunięta.",
    );

    await loadData();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nie udało się usunąć notatki.";

    setStatusMessage(message);
  } finally {
    setIsSaving(false);
  }
}
function handleStartEditingTask(
  task: LessonTask,
) {
  setEditingTaskId(task.id);
  setEditingTaskTitle(task.title);
  setEditingTaskContent(task.content ?? "");
  setEditingTaskAnswer(task.answer ?? "");
  setEditingTaskSolution(task.solution ?? "");
  setEditingTaskOrder(task.order ?? 0);
  setStatusMessage("");
}

function handleCancelEditingTask() {
  setEditingTaskId(null);
  setEditingTaskTitle("");
  setEditingTaskContent("");
  setEditingTaskAnswer("");
  setEditingTaskSolution("");
  setEditingTaskOrder(0);
}

async function handleSaveEditedTask(
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  if (!editingTaskId) {
    return;
  }

  if (!editingTaskTitle.trim()) {
    setStatusMessage(
      "Tytuł zadania nie może być pusty.",
    );

    return;
  }

  setIsSaving(true);
  setStatusMessage("");

  try {
    await updateAdminLessonTask({
      id: editingTaskId,
      title: editingTaskTitle.trim(),
      content: editingTaskContent.trim(),
      answer: editingTaskAnswer.trim(),
      solution: editingTaskSolution.trim(),
      order: editingTaskOrder,
    });

    handleCancelEditingTask();

    setStatusMessage(
      "Zadanie zostało zaktualizowane.",
    );

    await loadData();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nie udało się zapisać zadania.";

    setStatusMessage(message);
  } finally {
    setIsSaving(false);
  }
}

async function handleDeleteTask(
  taskId: string,
) {
  const confirmed = window.confirm(
    "Czy na pewno usunąć to zadanie? Tej operacji nie można cofnąć.",
  );

  if (!confirmed) {
    return;
  }

  setIsSaving(true);
  setStatusMessage("");

  try {
    await deleteAdminLessonTask(taskId);

    if (editingTaskId === taskId) {
      handleCancelEditingTask();
    }

    setStatusMessage(
      "Zadanie zostało usunięte.",
    );

    await loadData();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nie udało się usunąć zadania.";

    setStatusMessage(message);
  } finally {
    setIsSaving(false);
  }
}

  if (isLoading) {
    return (
      <main className="p-10 text-zinc-400">
        Pobieranie lekcji...
      </main>
    );
  }

  if (!lesson || !courseModule || !course) {
    return (
      <main className="p-10">
        Nie znaleziono lekcji.
      </main>
    );
  }

  const lessonIsComplete =
    Boolean(lesson.videoPath) &&
    notes.length > 0 &&
    tasks.length > 0;

  return (
    <main className="p-10">
      <Link
        href={`/admin/modules/${courseModule.id}`}
        className="text-sm text-zinc-400 hover:text-white"
      >
        ← Wróć do modułu
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm text-zinc-500">
            {course.title}
            {" → "}
            {courseModule.title}
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            {lesson.title}
          </h1>
        </div>

        <span
          className={
            lessonIsComplete
              ? "rounded-full bg-green-500/10 px-4 py-2 text-sm text-green-300"
              : "rounded-full bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300"
          }
        >
          {lessonIsComplete
            ? "Lekcja kompletna"
            : "Lekcja niekompletna"}
        </span>
      </div>

      <section className="mt-10 grid gap-4 md:grid-cols-4">
        <StatusCard
          label="Film"
          value={lesson.videoPath ? "Gotowy" : "Brak"}
          ready={Boolean(lesson.videoPath)}
        />

        <StatusCard
          label="Materiały"
          value={
            lesson.materialsPath
              ? "Gotowe"
              : "Brak"
          }
          ready={Boolean(lesson.materialsPath)}
        />

        <StatusCard
          label="Notatki"
          value={String(notes.length)}
          ready={notes.length > 0}
        />

        <StatusCard
          label="Zadania"
          value={String(tasks.length)}
          ready={tasks.length > 0}
        />
      </section>

      {statusMessage && (
        <p className="mt-6 rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-sm text-zinc-300">
          {statusMessage}
        </p>
      )}

      <form
        onSubmit={handleSaveLesson}
        className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
      >
        <h2 className="text-xl font-semibold">
          Ustawienia lekcji
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <input
            value={lesson.title}
            onChange={(event) =>
              setLesson({
                ...lesson,
                title: event.target.value,
              })
            }
            className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
            placeholder="Tytuł"
          />

          <input
            value={lesson.slug}
            onChange={(event) =>
              setLesson({
                ...lesson,
                slug: event.target.value,
              })
            }
            className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
            placeholder="Slug"
          />

          <input
            type="number"
            min={0}
            value={lesson.durationMinutes ?? 0}
            onChange={(event) =>
              setLesson({
                ...lesson,
                durationMinutes: Number(
                  event.target.value,
                ),
              })
            }
            className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
            placeholder="Czas"
          />

          <input
            type="number"
            min={0}
            value={lesson.order ?? 0}
            onChange={(event) =>
              setLesson({
                ...lesson,
                order: Number(
                  event.target.value,
                ),
              })
            }
            className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
            placeholder="Kolejność"
          />
        </div>

        <textarea
          value={lesson.description ?? ""}
          onChange={(event) =>
            setLesson({
              ...lesson,
              description: event.target.value,
            })
          }
          rows={5}
          className="mt-5 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
          placeholder="Opis"
        />

        <label className="mt-5 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={lesson.published ?? false}
            onChange={(event) =>
              setLesson({
                ...lesson,
                published:
                  event.target.checked,
              })
            }
          />

          Lekcja opublikowana
        </label>

        <button
          type="submit"
          disabled={isSaving}
          className="mt-6 rounded-xl bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
        >
          Zapisz ustawienia
        </button>
      </form>

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <LessonAssetUploader
          lessonId={lesson.id}
          courseSlug={course.slug}
          lessonSlug={lesson.slug}
          assetType="video"
          currentPath={lesson.videoPath}
          onPathSaved={(path) =>
            updateLessonVideoPath(
              lesson.id,
              path,
            )
          }
          onUploaded={(path) =>
            setLesson({
              ...lesson,
              videoPath: path,
            })
          }
        />

        <LessonAssetUploader
          lessonId={lesson.id}
          courseSlug={course.slug}
          lessonSlug={lesson.slug}
          assetType="materials"
          currentPath={lesson.materialsPath}
          onPathSaved={(path) =>
            updateLessonMaterialsPath(
              lesson.id,
              path,
            )
          }
          onUploaded={(path) =>
            setLesson({
              ...lesson,
              materialsPath: path,
            })
          }
        />
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-xl font-semibold">
            Notatki
          </h2>

<div className="mt-5 space-y-4">
  {notes.length === 0 && (
    <div className="rounded-xl border border-dashed border-zinc-700 p-5 text-sm text-zinc-400">
      Ta lekcja nie ma jeszcze żadnych notatek.
    </div>
  )}

  {notes.map((note) => {
    const isEditing =
      editingNoteId === note.id;

    if (isEditing) {
      return (
        <form
          key={note.id}
          onSubmit={handleSaveEditedNote}
          className="rounded-xl border border-blue-500/40 bg-blue-500/5 p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold text-blue-200">
              Edycja notatki
            </h3>

            <span className="text-xs text-zinc-500">
              ID: {note.id.slice(0, 8)}
            </span>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm text-zinc-300">
              Tytuł
            </span>

            <input
              value={editingNoteTitle}
              onChange={(event) =>
                setEditingNoteTitle(
                  event.target.value,
                )
              }
              disabled={isSaving}
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-white disabled:opacity-50"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm text-zinc-300">
              Treść
            </span>

            <textarea
              value={editingNoteContent}
              onChange={(event) =>
                setEditingNoteContent(
                  event.target.value,
                )
              }
              disabled={isSaving}
              rows={8}
              className="w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-white disabled:opacity-50"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm text-zinc-300">
              Kolejność
            </span>

            <input
              type="number"
              min={0}
              value={editingNoteOrder}
              onChange={(event) =>
                setEditingNoteOrder(
                  Number(event.target.value),
                )
              }
              disabled={isSaving}
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-white disabled:opacity-50"
            />
          </label>

          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={
                isSaving ||
                !editingNoteTitle.trim()
              }
              className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
            >
              {isSaving
                ? "Zapisywanie..."
                : "Zapisz zmiany"}
            </button>

            <button
              type="button"
              onClick={handleCancelEditingNote}
              disabled={isSaving}
              className="rounded-xl border border-zinc-700 px-5 py-3 text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:opacity-50"
            >
              Anuluj
            </button>
          </div>
        </form>
      );
    }

    return (
      <article
        key={note.id}
        className="rounded-xl border border-zinc-800 bg-black p-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-600">
              Notatka {note.order ?? 0}
            </p>

            <h3 className="mt-1 font-semibold">
              {note.title}
            </h3>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() =>
                handleStartEditingNote(note)
              }
              disabled={isSaving}
              className="text-sm text-blue-400 transition hover:text-blue-300 disabled:opacity-50"
            >
              Edytuj
            </button>

            <button
              type="button"
              onClick={() =>
                void handleDeleteNote(note.id)
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
    );
  })}
</div>

          <form
            onSubmit={handleCreateNote}
            className="mt-6 border-t border-zinc-800 pt-6"
          >
            <input
              value={noteTitle}
              onChange={(event) =>
                setNoteTitle(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
              placeholder="Tytuł notatki"
            />

            <textarea
              value={noteContent}
              onChange={(event) =>
                setNoteContent(
                  event.target.value,
                )
              }
              rows={7}
              className="mt-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
              placeholder="Treść notatki"
            />

            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-white px-5 py-3 font-semibold text-black"
            >
              Dodaj notatkę
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-xl font-semibold">
            Zadania
          </h2>

<div className="mt-5 space-y-4">
  {tasks.length === 0 && (
    <div className="rounded-xl border border-dashed border-zinc-700 p-5 text-sm text-zinc-400">
      Ta lekcja nie ma jeszcze żadnych zadań.
    </div>
  )}

  {tasks.map((task) => {
    const isEditing =
      editingTaskId === task.id;

    if (isEditing) {
      return (
        <form
          key={task.id}
          onSubmit={handleSaveEditedTask}
          className="rounded-xl border border-blue-500/40 bg-blue-500/5 p-4"
        >
          <h3 className="font-semibold text-blue-200">
            Edycja zadania
          </h3>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm text-zinc-300">
              Tytuł
            </span>

            <input
              value={editingTaskTitle}
              onChange={(event) =>
                setEditingTaskTitle(
                  event.target.value,
                )
              }
              disabled={isSaving}
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-white disabled:opacity-50"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm text-zinc-300">
              Treść zadania
            </span>

            <textarea
              value={editingTaskContent}
              onChange={(event) =>
                setEditingTaskContent(
                  event.target.value,
                )
              }
              disabled={isSaving}
              rows={6}
              className="w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-white disabled:opacity-50"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm text-zinc-300">
              Odpowiedź
            </span>

            <input
              value={editingTaskAnswer}
              onChange={(event) =>
                setEditingTaskAnswer(
                  event.target.value,
                )
              }
              disabled={isSaving}
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-white disabled:opacity-50"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm text-zinc-300">
              Pełne rozwiązanie
            </span>

            <textarea
              value={editingTaskSolution}
              onChange={(event) =>
                setEditingTaskSolution(
                  event.target.value,
                )
              }
              disabled={isSaving}
              rows={8}
              className="w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-white disabled:opacity-50"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm text-zinc-300">
              Kolejność
            </span>

            <input
              type="number"
              min={0}
              value={editingTaskOrder}
              onChange={(event) =>
                setEditingTaskOrder(
                  Number(event.target.value),
                )
              }
              disabled={isSaving}
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-white disabled:opacity-50"
            />
          </label>

          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={
                isSaving ||
                !editingTaskTitle.trim()
              }
              className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
            >
              {isSaving
                ? "Zapisywanie..."
                : "Zapisz zmiany"}
            </button>

            <button
              type="button"
              onClick={handleCancelEditingTask}
              disabled={isSaving}
              className="rounded-xl border border-zinc-700 px-5 py-3 text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:opacity-50"
            >
              Anuluj
            </button>
          </div>
        </form>
      );
    }

    return (
      <article
        key={task.id}
        className="rounded-xl border border-zinc-800 bg-black p-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-600">
              Zadanie {task.order ?? 0}
            </p>

            <h3 className="mt-1 font-semibold">
              {task.title}
            </h3>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() =>
                handleStartEditingTask(task)
              }
              disabled={isSaving}
              className="text-sm text-blue-400 transition hover:text-blue-300 disabled:opacity-50"
            >
              Edytuj
            </button>

            <button
              type="button"
              onClick={() =>
                void handleDeleteTask(task.id)
              }
              disabled={isSaving}
              className="text-sm text-red-400 transition hover:text-red-300 disabled:opacity-50"
            >
              Usuń
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
              Treść
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
              {task.content}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
              Odpowiedź
            </p>

            <p className="mt-2 text-sm text-zinc-300">
              {task.answer || "Brak odpowiedzi"}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
              Rozwiązanie
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
              {task.solution || "Brak rozwiązania"}
            </p>
          </div>
        </div>
      </article>
    );
  })}
</div>

          <form
            onSubmit={handleCreateTask}
            className="mt-6 border-t border-zinc-800 pt-6"
          >
            <input
              value={taskTitle}
              onChange={(event) =>
                setTaskTitle(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
              placeholder="Tytuł zadania"
            />

            <textarea
              value={taskContent}
              onChange={(event) =>
                setTaskContent(
                  event.target.value,
                )
              }
              rows={5}
              className="mt-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
              placeholder="Treść zadania"
            />

            <input
              value={taskAnswer}
              onChange={(event) =>
                setTaskAnswer(
                  event.target.value,
                )
              }
              className="mt-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
              placeholder="Odpowiedź"
            />

            <textarea
              value={taskSolution}
              onChange={(event) =>
                setTaskSolution(
                  event.target.value,
                )
              }
              rows={5}
              className="mt-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
              placeholder="Pełne rozwiązanie"
            />

            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-white px-5 py-3 font-semibold text-black"
            >
              Dodaj zadanie
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

type StatusCardProps = {
  label: string;
  value: string;
  ready: boolean;
};

function StatusCard({
  label,
  value,
  ready,
}: StatusCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-sm text-zinc-500">
        {label}
      </p>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-lg font-semibold">
          {value}
        </p>

        <span
          className={
            ready
              ? "h-3 w-3 rounded-full bg-green-400"
              : "h-3 w-3 rounded-full bg-red-400"
          }
        />
      </div>
    </div>
  );
}