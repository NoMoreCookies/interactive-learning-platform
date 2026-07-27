"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  useCallback,
  useEffect,
  useState,
  FormEvent,
} from "react";

import {
  createAdminModule,
  getAdminCourse,
  getAdminModulesByCourseId,
  updateAdminCourse,
  type CourseLevel,
  type CourseSubject,
} from "@/lib/services/admin-service";

type Course = NonNullable<
  Awaited<ReturnType<typeof getAdminCourse>>
>;

type CourseModule = Awaited<
  ReturnType<typeof getAdminModulesByCourseId>
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
function parseCourseSubject(
  value: string | null | undefined,
): CourseSubject | null {
  if (
    value === "MATHEMATICS" ||
    value === "PHYSICS" ||
    value === "COMPUTER_SCIENCE"
  ) {
    return value;
  }

  return null;
}

function parseCourseLevel(
  value: string | null | undefined,
): CourseLevel | null {
  if (
    value === "BASIC" ||
    value === "EXTENDED"
  ) {
    return value;
  }

  return null;
}
export default function AdminCoursePage() {
  const params = useParams<{
    courseId: string;
  }>();

  const courseId = params.courseId;

  const [course, setCourse] =
    useState<Course | null>(null);

  const [modules, setModules] =
    useState<CourseModule[]>([]);

  const [moduleTitle, setModuleTitle] =
    useState("");

  const [moduleDescription, setModuleDescription] =
    useState("");

  const [statusMessage, setStatusMessage] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [courseResult, modulesResult] =
        await Promise.all([
          getAdminCourse(courseId),
          getAdminModulesByCourseId(courseId),
        ]);

      setCourse(courseResult);
      setModules(modulesResult);
    } catch (error) {
      console.error(error);

      setStatusMessage(
        "Nie udało się pobrać kursu.",
      );
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
        title: course.title,
        slug: course.slug,
        description: course.description ?? "",
        subject: parseCourseSubject(course.subject),
        level: parseCourseLevel(course.level),
        order: course.order ?? 0,
        published: course.published ?? false,
        });

      setStatusMessage(
        "Zmiany w kursie zostały zapisane.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nie udało się zapisać kursu.";

      setStatusMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateModule(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!moduleTitle.trim()) {
      setStatusMessage(
        "Podaj nazwę modułu.",
      );

      return;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      await createAdminModule({
        courseId,
        title: moduleTitle.trim(),
        slug: createSlug(moduleTitle),
        description: moduleDescription.trim(),
        order: modules.length + 1,
        published: false,
      });

      setModuleTitle("");
      setModuleDescription("");

      setStatusMessage(
        "Moduł został utworzony.",
      );

      await loadData();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nie udało się utworzyć modułu.";

      setStatusMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="p-10 text-zinc-400">
        Pobieranie kursu...
      </main>
    );
  }

  if (!course) {
    return (
      <main className="p-10">
        Nie znaleziono kursu.
      </main>
    );
  }

  return (
    <main className="p-10">
      <Link
        href="/admin/courses"
        className="text-sm text-zinc-400 hover:text-white"
      >
        ← Wróć do kursów
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Kurs
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            {course.title}
          </h1>
        </div>

        <span
          className={
            course.published
              ? "rounded-full bg-green-500/10 px-4 py-2 text-sm text-green-300"
              : "rounded-full bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300"
          }
        >
          {course.published
            ? "Opublikowany"
            : "Szkic"}
        </span>
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[1fr_420px]">
        <div className="space-y-8">
          <form
            onSubmit={handleSaveCourse}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
          >
            <h2 className="text-xl font-semibold">
              Ustawienia kursu
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <input
                value={course.title}
                onChange={(event) =>
                  setCourse({
                    ...course,
                    title: event.target.value,
                  })
                }
                className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
                placeholder="Nazwa kursu"
              />

              <input
                value={course.slug}
                onChange={(event) =>
                  setCourse({
                    ...course,
                    slug: event.target.value,
                  })
                }
                className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
                placeholder="Slug"
              />

              <select
                value={course.subject ?? ""}
                onChange={(event) =>
                    setCourse({
                    ...course,
                    subject:
                        event.target.value === ""
                        ? null
                        : (event.target.value as
                            | "MATHEMATICS"
                            | "PHYSICS"
                            | "COMPUTER_SCIENCE"),
                    })
                }
                className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
                >
  <option value="">
    Wybierz przedmiot
  </option>

  <option value="MATHEMATICS">
    Matematyka
  </option>

  <option value="PHYSICS">
    Fizyka
  </option>

  <option value="COMPUTER_SCIENCE">
    Informatyka
  </option>
</select>

        <select
        value={course.level ?? ""}
        onChange={(event) =>
            setCourse({
            ...course,
            level:
                event.target.value === ""
                ? null
                : (event.target.value as CourseLevel),
            })
        }
        className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
        >
        <option value="">
            Wybierz poziom
        </option>

        <option value="BASIC">
            Podstawowy
        </option>

        <option value="EXTENDED">
            Rozszerzony
        </option>
        </select>
            </div>

            <textarea
              value={course.description ?? ""}
              onChange={(event) =>
                setCourse({
                  ...course,
                  description: event.target.value,
                })
              }
              rows={5}
              className="mt-5 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
              placeholder="Opis"
            />

            <label className="mt-5 flex items-center gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={course.published ?? false}
                onChange={(event) =>
                  setCourse({
                    ...course,
                    published: event.target.checked,
                  })
                }
              />

              Kurs opublikowany
            </label>

            <button
              type="submit"
              disabled={isSaving}
              className="mt-6 rounded-xl bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
            >
              Zapisz kurs
            </button>
          </form>

          <section>
            <h2 className="text-2xl font-semibold">
              Moduły
            </h2>

            <div className="mt-5 space-y-4">
              {modules.length === 0 && (
                <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-zinc-400">
                  Ten kurs nie ma jeszcze modułów.
                </div>
              )}

              {modules.map((courseModule) => (
                <Link
                  key={courseModule.id}
                  href={`/admin/modules/${courseModule.id}`}
                  className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-600"
                >
                  <div>
                    <p className="text-sm text-zinc-500">
                      Moduł {courseModule.order}
                    </p>

                    <h3 className="mt-1 text-lg font-semibold">
                      {courseModule.title}
                    </h3>
                  </div>

                  <span className="text-sm text-zinc-400">
                    Edytuj →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <form
          onSubmit={handleCreateModule}
          className="h-fit rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
        >
          <h2 className="text-xl font-semibold">
            Dodaj moduł
          </h2>

          <input
            value={moduleTitle}
            onChange={(event) =>
              setModuleTitle(event.target.value)
            }
            className="mt-6 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
            placeholder="Nazwa modułu"
          />

          <textarea
            value={moduleDescription}
            onChange={(event) =>
              setModuleDescription(
                event.target.value,
              )
            }
            rows={5}
            className="mt-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
            placeholder="Opis modułu"
          />

          <button
            type="submit"
            disabled={isSaving}
            className="mt-5 w-full rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
          >
            Dodaj moduł
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