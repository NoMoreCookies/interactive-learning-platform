"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import CourseCreateForm, {
  type CreateCourseInput,
} from "@/components/admin/course/CourseCreateForm";
import CourseList from "@/components/admin/course/CourseList";

import type { AdminCourseListItem } from "@/components/admin/course/types";

import {
  PageHeader,
  StatusMessage,
} from "@/components/ui";

import {
  createAdminCourse,
  getAdminCourses,
} from "@/lib/services/admin-service";

import { createSlug } from "@/lib/utils/create-slug";

export default function AdminCoursesPage() {
  const [courses, setCourses] =
    useState<AdminCourseListItem[]>([]);

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

  const loadCourses =
    useCallback(async () => {
      setIsLoading(true);

      try {
        const result =
          await getAdminCourses();

        setCourses(result);
      } catch (error) {
        console.error(
          "Failed to load admin courses.",
          error,
        );

        setStatusMessage(
          "Nie udało się pobrać kursów.",
        );
        setStatusTone("error");
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  async function handleCreateCourse(
    input: CreateCourseInput,
  ): Promise<boolean> {
    const title = input.title.trim();
    const slug = createSlug(title);

    if (!title) {
      setStatusMessage(
        "Podaj nazwę kursu.",
      );
      setStatusTone("error");
      return false;
    }

    if (!slug) {
      setStatusMessage(
        "Nie udało się utworzyć poprawnego slugu kursu.",
      );
      setStatusTone("error");
      return false;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      await createAdminCourse({
        title,
        slug,
        description:
          input.description.trim(),
        subject: input.subject,
        level: input.level,
        order: courses.length + 1,
        published: false,
      });

      setStatusMessage(
        "Kurs został utworzony.",
      );
      setStatusTone("success");

      await loadCourses();
      return true;
    } catch (error) {
      setStatusMessage(
        getErrorMessage(
          error,
          "Nie udało się utworzyć kursu.",
        ),
      );
      setStatusTone("error");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main>
      <PageHeader
        eyebrow="Zawartość"
        title="Kursy"
        description="Twórz kursy, a następnie dodawaj do nich moduły i lekcje."
      />

      {statusMessage && (
        <StatusMessage
          tone={statusTone}
          className="mt-6"
        >
          {statusMessage}
        </StatusMessage>
      )}

      <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section>
          <h2 className="text-xl font-semibold text-zinc-100">
            Istniejące kursy
          </h2>

          <div className="mt-5">
            <CourseList
              courses={courses}
              isLoading={isLoading}
            />
          </div>
        </section>

        <CourseCreateForm
          isSaving={isSaving}
          onCreate={handleCreateCourse}
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
