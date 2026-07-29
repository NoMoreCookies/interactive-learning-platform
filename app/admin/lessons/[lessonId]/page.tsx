"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import LessonAssetUploader from "@/components/admin/LessonAssetUploader";
import LessonNotesSection from "@/components/admin/lesson/LessonNotesSection";
import LessonSettingsForm from "@/components/admin/lesson/LessonSettingsForm";
import LessonStatusCards from "@/components/admin/lesson/LessonStatusCards";
import LessonTasksSection from "@/components/admin/lesson/LessonTasksSection";

import type {
  AdminCourse,
  AdminLesson,
  AdminLessonNote,
  AdminLessonTask,
  AdminModule,
} from "@/components/admin/lesson/types";

import {
  PageContainer,
  StatusMessage,
} from "@/components/ui";

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

export default function AdminLessonPage() {
  const params = useParams<{
    lessonId: string;
  }>();

  const lessonId = params.lessonId;

  const [lesson, setLesson] =
    useState<AdminLesson | null>(null);

  const [
    courseModule,
    setCourseModule,
  ] = useState<AdminModule | null>(null);

  const [course, setCourse] =
    useState<AdminCourse | null>(null);

  const [notes, setNotes] =
    useState<AdminLessonNote[]>([]);

  const [tasks, setTasks] =
    useState<AdminLessonTask[]>([]);

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const [
    statusTone,
    setStatusTone,
  ] = useState<
    "info" | "success" | "error"
  >("info");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const showStatus = useCallback(
    (
      message: string,
      tone:
        | "info"
        | "success"
        | "error" = "info",
    ) => {
      setStatusMessage(message);
      setStatusTone(tone);
    },
    [],
  );

  const loadData = useCallback(
    async () => {
      setIsLoading(true);

      try {
        const lessonResult =
          await getAdminLesson(lessonId);

        if (!lessonResult) {
          setLesson(null);
          setCourseModule(null);
          setCourse(null);
          setNotes([]);
          setTasks([]);
          return;
        }

        const [
          moduleResult,
          notesResult,
          tasksResult,
        ] = await Promise.all([
          getAdminModule(
            lessonResult.moduleId,
          ),
          getAdminLessonNotes(lessonId),
          getAdminLessonTasks(lessonId),
        ]);

        const courseResult =
          moduleResult
            ? await getAdminCourse(
                moduleResult.courseId,
              )
            : null;

        setLesson(lessonResult);
        setCourseModule(moduleResult);
        setCourse(courseResult);
        setNotes(notesResult);
        setTasks(tasksResult);
      } catch (error) {
        console.error(
          "Failed to load lesson administration data.",
          error,
        );

        showStatus(
          "Nie udało się pobrać danych lekcji.",
          "error",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [lessonId, showStatus],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSaveLesson(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!lesson) {
      return;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      await updateAdminLesson({
        id: lesson.id,
        title: lesson.title.trim(),
        slug: lesson.slug.trim(),
        description:
          lesson.description?.trim() ?? "",
        durationMinutes:
          lesson.durationMinutes ?? 0,
        order: lesson.order ?? 0,
        published:
          lesson.published ?? false,
      });

      showStatus(
        "Lekcja została zapisana.",
        "success",
      );
    } catch (error) {
      showStatus(
        getErrorMessage(
          error,
          "Nie udało się zapisać lekcji.",
        ),
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateNote(input: {
    title: string;
    content: string;
  }): Promise<boolean> {
    if (!input.title.trim()) {
      showStatus(
        "Podaj tytuł notatki.",
        "error",
      );
      return false;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      await createAdminLessonNote({
        lessonId,
        title: input.title.trim(),
        content: input.content.trim(),
        order: notes.length + 1,
      });

      showStatus(
        "Notatka została dodana.",
        "success",
      );

      await loadData();
      return true;
    } catch (error) {
      showStatus(
        getErrorMessage(
          error,
          "Nie udało się dodać notatki.",
        ),
        "error",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateNote(input: {
    id: string;
    title: string;
    content: string;
    order: number;
  }): Promise<boolean> {
    if (!input.title.trim()) {
      showStatus(
        "Tytuł notatki nie może być pusty.",
        "error",
      );
      return false;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      await updateAdminLessonNote({
        ...input,
        title: input.title.trim(),
        content: input.content.trim(),
      });

      showStatus(
        "Notatka została zaktualizowana.",
        "success",
      );

      await loadData();
      return true;
    } catch (error) {
      showStatus(
        getErrorMessage(
          error,
          "Nie udało się zapisać notatki.",
        ),
        "error",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteNote(
    noteId: string,
  ): Promise<boolean> {
    setIsSaving(true);
    setStatusMessage("");

    try {
      await deleteAdminLessonNote(
        noteId,
      );

      showStatus(
        "Notatka została usunięta.",
        "success",
      );

      await loadData();
      return true;
    } catch (error) {
      showStatus(
        getErrorMessage(
          error,
          "Nie udało się usunąć notatki.",
        ),
        "error",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateTask(input: {
    title: string;
    content: string;
    answer: string;
    solution: string;
  }): Promise<boolean> {
    if (!input.title.trim()) {
      showStatus(
        "Podaj tytuł zadania.",
        "error",
      );
      return false;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      await createAdminLessonTask({
        lessonId,
        title: input.title.trim(),
        content: input.content.trim(),
        answer: input.answer.trim(),
        solution: input.solution.trim(),
        order: tasks.length + 1,
      });

      showStatus(
        "Zadanie zostało dodane.",
        "success",
      );

      await loadData();
      return true;
    } catch (error) {
      showStatus(
        getErrorMessage(
          error,
          "Nie udało się dodać zadania.",
        ),
        "error",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateTask(input: {
    id: string;
    title: string;
    content: string;
    answer: string;
    solution: string;
    order: number;
  }): Promise<boolean> {
    if (!input.title.trim()) {
      showStatus(
        "Tytuł zadania nie może być pusty.",
        "error",
      );
      return false;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      await updateAdminLessonTask({
        ...input,
        title: input.title.trim(),
        content: input.content.trim(),
        answer: input.answer.trim(),
        solution: input.solution.trim(),
      });

      showStatus(
        "Zadanie zostało zaktualizowane.",
        "success",
      );

      await loadData();
      return true;
    } catch (error) {
      showStatus(
        getErrorMessage(
          error,
          "Nie udało się zapisać zadania.",
        ),
        "error",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteTask(
    taskId: string,
  ): Promise<boolean> {
    setIsSaving(true);
    setStatusMessage("");

    try {
      await deleteAdminLessonTask(
        taskId,
      );

      showStatus(
        "Zadanie zostało usunięte.",
        "success",
      );

      await loadData();
      return true;
    } catch (error) {
      showStatus(
        getErrorMessage(
          error,
          "Nie udało się usunąć zadania.",
        ),
        "error",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <PageContainer className="py-12 text-zinc-400">
        Pobieranie lekcji...
      </PageContainer>
    );
  }

  if (
    !lesson ||
    !courseModule ||
    !course
  ) {
    return (
      <PageContainer className="py-12 text-zinc-300">
        Nie znaleziono lekcji.
      </PageContainer>
    );
  }

  const lessonIsComplete =
    Boolean(lesson.videoPath) &&
    notes.length > 0 &&
    tasks.length > 0;

  return (
    <PageContainer className="py-10">
      <Link
        href={`/admin/modules/${courseModule.id}`}
        className="text-sm text-zinc-400 transition hover:text-zinc-100"
      >
        ← Wróć do modułu
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm text-zinc-500">
            {course.title}
            {" → "}
            {courseModule.title}
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-100">
            {lesson.title}
          </h1>
        </div>

        <span
          className={[
            "rounded-full px-4 py-2 text-sm",
            lessonIsComplete
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-amber-500/10 text-amber-300",
          ].join(" ")}
        >
          {lessonIsComplete
            ? "Lekcja kompletna"
            : "Lekcja niekompletna"}
        </span>
      </header>

      <div className="mt-10">
        <LessonStatusCards
          hasVideo={Boolean(
            lesson.videoPath,
          )}
          hasMaterials={Boolean(
            lesson.materialsPath,
          )}
          notesCount={notes.length}
          tasksCount={tasks.length}
        />
      </div>

      {statusMessage && (
        <StatusMessage
          tone={statusTone}
          className="mt-6"
        >
          {statusMessage}
        </StatusMessage>
      )}

      <div className="mt-8">
        <LessonSettingsForm
          lesson={lesson}
          isSaving={isSaving}
          onLessonChange={setLesson}
          onSubmit={handleSaveLesson}
        />
      </div>

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
            setLesson((current) =>
              current
                ? {
                    ...current,
                    videoPath: path,
                  }
                : current,
            )
          }
        />

        <LessonAssetUploader
          lessonId={lesson.id}
          courseSlug={course.slug}
          lessonSlug={lesson.slug}
          assetType="materials"
          currentPath={
            lesson.materialsPath
          }
          onPathSaved={(path) =>
            updateLessonMaterialsPath(
              lesson.id,
              path,
            )
          }
          onUploaded={(path) =>
            setLesson((current) =>
              current
                ? {
                    ...current,
                    materialsPath: path,
                  }
                : current,
            )
          }
        />
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <LessonNotesSection
          notes={notes}
          isSaving={isSaving}
          onCreate={handleCreateNote}
          onUpdate={handleUpdateNote}
          onDelete={handleDeleteNote}
        />

        <LessonTasksSection
          tasks={tasks}
          isSaving={isSaving}
          onCreate={handleCreateTask}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      </div>
    </PageContainer>
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error &&
    error.message
    ? error.message
    : fallback;
}
