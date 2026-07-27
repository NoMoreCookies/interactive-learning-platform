"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  createAdminLesson,
  getAdminLessonsByModuleId,
  getAdminModule,
  updateAdminModule,
} from "@/lib/services/admin-service";

type CourseModule = NonNullable<
  Awaited<ReturnType<typeof getAdminModule>>
>;

type Lesson = Awaited<
  ReturnType<typeof getAdminLessonsByModuleId>
>[number];

function createSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminModulePage() {
  const params = useParams<{
    moduleId: string;
  }>();

  const moduleId = params.moduleId;

  const [courseModule, setCourseModule] =
    useState<CourseModule | null>(null);

  const [lessons, setLessons] =
    useState<Lesson[]>([]);

  const [lessonTitle, setLessonTitle] =
    useState("");

  const [lessonDescription, setLessonDescription] =
    useState("");

  const [durationMinutes, setDurationMinutes] =
    useState(30);

  const [statusMessage, setStatusMessage] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  async function loadData() {
    setIsLoading(true);

    try {
      const [moduleResult, lessonsResult] =
        await Promise.all([
          getAdminModule(moduleId),
          getAdminLessonsByModuleId(moduleId),
        ]);

      setCourseModule(moduleResult);
      setLessons(lessonsResult);
    } catch (error) {
      console.error(error);

      setStatusMessage(
        "Nie udało się pobrać modułu.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [moduleId]);

  async function handleSaveModule(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!courseModule) {
      return;
    }

    setIsSaving(true);

    try {
      await updateAdminModule({
        id: courseModule.id,
        title: courseModule.title,
        slug: courseModule.slug,
        description:
          courseModule.description ?? "",
        order: courseModule.order ?? 0,
        published:
          courseModule.published ?? false,
      });

      setStatusMessage(
        "Moduł został zapisany.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nie udało się zapisać modułu.";

      setStatusMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateLesson(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!lessonTitle.trim()) {
      setStatusMessage(
        "Podaj nazwę lekcji.",
      );

      return;
    }

    setIsSaving(true);

    try {
      await createAdminLesson({
        moduleId,
        title: lessonTitle.trim(),
        slug: createSlug(lessonTitle),
        description:
          lessonDescription.trim(),
        durationMinutes,
        order: lessons.length + 1,
        published: false,
      });

      setLessonTitle("");
      setLessonDescription("");
      setDurationMinutes(30);

      setStatusMessage(
        "Lekcja została utworzona.",
      );

      await loadData();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nie udało się utworzyć lekcji.";

      setStatusMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="p-10 text-zinc-400">
        Pobieranie modułu...
      </main>
    );
  }

  if (!courseModule) {
    return (
      <main className="p-10">
        Nie znaleziono modułu.
      </main>
    );
  }

  return (
    <main className="p-10">
      <Link
        href={`/admin/courses/${courseModule.courseId}`}
        className="text-sm text-zinc-400 hover:text-white"
      >
        ← Wróć do kursu
      </Link>

      <h1 className="mt-6 text-4xl font-bold">
        {courseModule.title}
      </h1>

      <div className="mt-10 grid gap-8 xl:grid-cols-[1fr_420px]">
        <div className="space-y-8">
          <form
            onSubmit={handleSaveModule}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
          >
            <h2 className="text-xl font-semibold">
              Ustawienia modułu
            </h2>

            <input
              value={courseModule.title}
              onChange={(event) =>
                setCourseModule({
                  ...courseModule,
                  title: event.target.value,
                })
              }
              className="mt-6 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
            />

            <input
              value={courseModule.slug}
              onChange={(event) =>
                setCourseModule({
                  ...courseModule,
                  slug: event.target.value,
                })
              }
              className="mt-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
            />

            <textarea
              value={
                courseModule.description ?? ""
              }
              onChange={(event) =>
                setCourseModule({
                  ...courseModule,
                  description:
                    event.target.value,
                })
              }
              rows={5}
              className="mt-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
            />

            <label className="mt-5 flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={
                  courseModule.published ??
                  false
                }
                onChange={(event) =>
                  setCourseModule({
                    ...courseModule,
                    published:
                      event.target.checked,
                  })
                }
              />

              Moduł opublikowany
            </label>

            <button
              type="submit"
              className="mt-6 rounded-xl bg-white px-6 py-3 font-semibold text-black"
            >
              Zapisz moduł
            </button>
          </form>

          <section>
            <h2 className="text-2xl font-semibold">
              Lekcje
            </h2>

            <div className="mt-5 space-y-4">
              {lessons.length === 0 && (
                <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-zinc-400">
                  Ten moduł nie ma jeszcze
                  lekcji.
                </div>
              )}

              {lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/admin/lessons/${lesson.id}`}
                  className="block rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-600"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-500">
                        Lekcja {lesson.order}
                      </p>

                      <h3 className="mt-1 text-lg font-semibold">
                        {lesson.title}
                      </h3>
                    </div>

                    <div className="flex gap-2 text-xs">
                      <span
                        className={
                          lesson.videoPath
                            ? "rounded-full bg-green-500/10 px-3 py-1 text-green-300"
                            : "rounded-full bg-red-500/10 px-3 py-1 text-red-300"
                        }
                      >
                        Film
                      </span>

                      <span
                        className={
                          lesson.materialsPath
                            ? "rounded-full bg-green-500/10 px-3 py-1 text-green-300"
                            : "rounded-full bg-red-500/10 px-3 py-1 text-red-300"
                        }
                      >
                        Materiały
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <form
          onSubmit={handleCreateLesson}
          className="h-fit rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
        >
          <h2 className="text-xl font-semibold">
            Dodaj lekcję
          </h2>

          <input
            value={lessonTitle}
            onChange={(event) =>
              setLessonTitle(event.target.value)
            }
            className="mt-6 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
            placeholder="Nazwa lekcji"
          />

          <textarea
            value={lessonDescription}
            onChange={(event) =>
              setLessonDescription(
                event.target.value,
              )
            }
            rows={5}
            className="mt-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
            placeholder="Opis lekcji"
          />

          <input
            type="number"
            min={0}
            value={durationMinutes}
            onChange={(event) =>
              setDurationMinutes(
                Number(event.target.value),
              )
            }
            className="mt-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
            placeholder="Czas lekcji"
          />

          <button
            type="submit"
            disabled={isSaving}
            className="mt-5 w-full rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
          >
            Dodaj lekcję
          </button>

          {statusMessage && (
            <p className="mt-4 text-sm text-zinc-300">
              {statusMessage}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}