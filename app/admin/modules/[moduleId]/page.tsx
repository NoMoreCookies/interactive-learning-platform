"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import LessonCreateForm, {
  type CreateLessonInput,
} from "@/components/admin/module/LessonCreateForm";
import ModuleLessonsList from "@/components/admin/module/ModuleLessonsList";
import ModuleSettingsForm from "@/components/admin/module/ModuleSettingsForm";

import type {
  AdminModule,
  AdminModuleLesson,
} from "@/components/admin/module/types";

import { StatusMessage } from "@/components/ui";

import {
  createAdminLesson,
  getAdminLessonsByModuleId,
  getAdminModule,
  updateAdminModule,
} from "@/lib/services/admin-service";

import { createSlug } from "@/lib/utils/create-slug";

export default function AdminModulePage() {
  const params = useParams<{
    moduleId: string;
  }>();

  const moduleId = params.moduleId;

  const [
    courseModule,
    setCourseModule,
  ] = useState<AdminModule | null>(
    null,
  );

  const [lessons, setLessons] =
    useState<AdminModuleLesson[]>([]);

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

  const loadData =
    useCallback(async () => {
      setIsLoading(true);

      try {
        const [
          moduleResult,
          lessonsResult,
        ] = await Promise.all([
          getAdminModule(moduleId),
          getAdminLessonsByModuleId(
            moduleId,
          ),
        ]);

        setCourseModule(moduleResult);
        setLessons(lessonsResult);
      } catch (error) {
        console.error(
          "Failed to load module administration data.",
          error,
        );

        setStatusMessage(
          "Nie udało się pobrać modułu.",
        );
        setStatusTone("error");
      } finally {
        setIsLoading(false);
      }
    }, [moduleId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSaveModule(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!courseModule) {
      return;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      await updateAdminModule({
        id: courseModule.id,
        title:
          courseModule.title.trim(),
        slug: courseModule.slug.trim(),
        description:
          courseModule.description?.trim() ??
          "",
        order:
          courseModule.order ?? 0,
        published:
          courseModule.published ?? false,
      });

      setStatusMessage(
        "Moduł został zapisany.",
      );
      setStatusTone("success");
    } catch (error) {
      setStatusMessage(
        getErrorMessage(
          error,
          "Nie udało się zapisać modułu.",
        ),
      );
      setStatusTone("error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateLesson(
    input: CreateLessonInput,
  ): Promise<boolean> {
    const title = input.title.trim();
    const slug = createSlug(title);

    if (!title) {
      setStatusMessage(
        "Podaj nazwę lekcji.",
      );
      setStatusTone("error");
      return false;
    }

    if (!slug) {
      setStatusMessage(
        "Nie udało się utworzyć poprawnego slugu lekcji.",
      );
      setStatusTone("error");
      return false;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      await createAdminLesson({
        moduleId,
        title,
        slug,
        description:
          input.description.trim(),
        durationMinutes:
          input.durationMinutes,
        order: lessons.length + 1,
        published: false,
      });

      setStatusMessage(
        "Lekcja została utworzona.",
      );
      setStatusTone("success");

      await loadData();
      return true;
    } catch (error) {
      setStatusMessage(
        getErrorMessage(
          error,
          "Nie udało się utworzyć lekcji.",
        ),
      );
      setStatusTone("error");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="text-zinc-400">
        Pobieranie modułu...
      </main>
    );
  }

  if (!courseModule) {
    return (
      <main className="text-zinc-300">
        Nie znaleziono modułu.
      </main>
    );
  }

  return (
    <main>
      <Link
        href={`/admin/courses/${courseModule.courseId}`}
        className="text-sm text-zinc-400 transition hover:text-zinc-100"
      >
        ← Wróć do kursu
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-blue-400">
            Moduł
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-100">
            {courseModule.title}
          </h1>
        </div>

        <span
          className={[
            "rounded-full px-4 py-2 text-sm",
            courseModule.published
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-amber-500/10 text-amber-300",
          ].join(" ")}
        >
          {courseModule.published
            ? "Opublikowany"
            : "Szkic"}
        </span>
      </header>

      {statusMessage && (
        <StatusMessage
          tone={statusTone}
          className="mt-6"
        >
          {statusMessage}
        </StatusMessage>
      )}

      <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-8">
          <ModuleSettingsForm
            courseModule={courseModule}
            isSaving={isSaving}
            onModuleChange={
              setCourseModule
            }
            onSubmit={handleSaveModule}
          />

          <ModuleLessonsList
            lessons={lessons}
          />
        </div>

        <LessonCreateForm
          isSaving={isSaving}
          onCreate={handleCreateLesson}
        />
      </div>
    </main>
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
