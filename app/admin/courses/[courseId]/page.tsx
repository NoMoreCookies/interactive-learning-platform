"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import CourseModulesList from "@/components/admin/course/CourseModulesList";
import CourseSettingsForm from "@/components/admin/course/CourseSettingsForm";
import ModuleCreateForm, {
  type CreateModuleInput,
} from "@/components/admin/course/ModuleCreateForm";

import type {
  AdminCourse,
  AdminCourseModule,
} from "@/components/admin/course/types";

import { StatusMessage } from "@/components/ui";

import {
  createAdminModule,
  getAdminCourse,
  getAdminModulesByCourseId,
  updateAdminCourse,
} from "@/lib/services/admin-service";

import {
  parseCourseLevel,
  parseCourseSubject,
} from "@/lib/utils/course-values";

import { createSlug } from "@/lib/utils/create-slug";

export default function AdminCoursePage() {
  const params = useParams<{
    courseId: string;
  }>();

  const courseId = params.courseId;

  const [course, setCourse] =
    useState<AdminCourse | null>(null);

  const [modules, setModules] =
    useState<AdminCourseModule[]>([]);

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
          courseResult,
          modulesResult,
        ] = await Promise.all([
          getAdminCourse(courseId),
          getAdminModulesByCourseId(
            courseId,
          ),
        ]);

        setCourse(courseResult);
        setModules(modulesResult);
      } catch (error) {
        console.error(
          "Failed to load course administration data.",
          error,
        );

        setStatusMessage(
          "Nie udało się pobrać kursu.",
        );
        setStatusTone("error");
      } finally {
        setIsLoading(false);
      }
    }, [courseId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSaveCourse(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!course) {
      return;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      await updateAdminCourse({
        id: course.id,
        title: course.title.trim(),
        slug: course.slug.trim(),
        description:
          course.description?.trim() ?? "",
        subject: parseCourseSubject(
          course.subject,
        ),
        level: parseCourseLevel(
          course.level,
        ),
        order: course.order ?? 0,
        published:
          course.published ?? false,
      });

      setStatusMessage(
        "Zmiany w kursie zostały zapisane.",
      );
      setStatusTone("success");
    } catch (error) {
      setStatusMessage(
        getErrorMessage(
          error,
          "Nie udało się zapisać kursu.",
        ),
      );
      setStatusTone("error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateModule(
    input: CreateModuleInput,
  ): Promise<boolean> {
    const title = input.title.trim();
    const slug = createSlug(title);

    if (!title) {
      setStatusMessage(
        "Podaj nazwę modułu.",
      );
      setStatusTone("error");
      return false;
    }

    if (!slug) {
      setStatusMessage(
        "Nie udało się utworzyć poprawnego slugu modułu.",
      );
      setStatusTone("error");
      return false;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      await createAdminModule({
        courseId,
        title,
        slug,
        description:
          input.description.trim(),
        order: modules.length + 1,
        published: false,
      });

      setStatusMessage(
        "Moduł został utworzony.",
      );
      setStatusTone("success");

      await loadData();
      return true;
    } catch (error) {
      setStatusMessage(
        getErrorMessage(
          error,
          "Nie udało się utworzyć modułu.",
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
        Pobieranie kursu...
      </main>
    );
  }

  if (!course) {
    return (
      <main className="text-zinc-300">
        Nie znaleziono kursu.
      </main>
    );
  }

  return (
    <main>
      <Link
        href="/admin/courses"
        className="text-sm text-zinc-400 transition hover:text-zinc-100"
      >
        ← Wróć do kursów
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-blue-400">
            Kurs
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-100">
            {course.title}
          </h1>
        </div>

        <span
          className={[
            "rounded-full px-4 py-2 text-sm",
            course.published
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-amber-500/10 text-amber-300",
          ].join(" ")}
        >
          {course.published
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
          <CourseSettingsForm
            course={course}
            isSaving={isSaving}
            onCourseChange={setCourse}
            onSubmit={handleSaveCourse}
          />

          <CourseModulesList
            modules={modules}
          />
        </div>

        <ModuleCreateForm
          isSaving={isSaving}
          onCreate={handleCreateModule}
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
