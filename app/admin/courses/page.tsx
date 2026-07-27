"use client";

import Link from "next/link";

import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  createAdminCourse,
  getAdminCourses,
  type CourseLevel,
  type CourseSubject,
} from "@/lib/services/admin-service";

type AdminCourse = Awaited<
  ReturnType<typeof getAdminCourses>
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

function getSubjectLabel(
  subject?: CourseSubject | null,
): string {
  switch (subject) {
    case "MATHEMATICS":
      return "Matematyka";

    case "PHYSICS":
      return "Fizyka";

    case "COMPUTER_SCIENCE":
      return "Informatyka";

    default:
      return "Brak przedmiotu";
  }
}

function getLevelLabel(
  level?: CourseLevel | null,
): string {
  switch (level) {
    case "BASIC":
      return "Podstawowy";

    case "EXTENDED":
      return "Rozszerzony";

    default:
      return "Brak poziomu";
  }
}

export default function AdminCoursesPage() {
  const [courses, setCourses] =
    useState<AdminCourse[]>([]);

  const [title, setTitle] =
    useState("");

  const [subject, setSubject] =
    useState<CourseSubject>("MATHEMATICS");

  const [level, setLevel] =
    useState<CourseLevel>("EXTENDED");

  const [description, setDescription] =
    useState("");

  const [statusMessage, setStatusMessage] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  async function loadCourses() {
    setIsLoading(true);

    try {
      const result =
        await getAdminCourses();

      setCourses(result);
    } catch (error) {
      console.error(
        "Błąd pobierania kursów:",
        error,
      );

      setStatusMessage(
        "Nie udało się pobrać kursów.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCourses();
  }, []);

  async function handleCreateCourse(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedTitle =
      title.trim();

    if (!normalizedTitle) {
      setStatusMessage(
        "Podaj nazwę kursu.",
      );

      return;
    }

    const slug =
      createSlug(normalizedTitle);

    if (!slug) {
      setStatusMessage(
        "Nie udało się utworzyć poprawnego slugu kursu.",
      );

      return;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      await createAdminCourse({
        title: normalizedTitle,
        slug,
        description:
          description.trim(),

        // Nie używamy trim().
        // subject i level są już poprawnymi enumami.
        subject,
        level,

        order: courses.length + 1,
        published: false,
      });

      setTitle("");
      setDescription("");

      // Przywracamy poprawne wartości enumów,
      // a nie pusty string.
      setSubject("MATHEMATICS");
      setLevel("EXTENDED");

      setStatusMessage(
        "Kurs został utworzony.",
      );

      await loadCourses();
    } catch (error) {
      console.error(
        "Błąd tworzenia kursu:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Wystąpił nieznany błąd.";

      setStatusMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="p-10">
      <header>
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
          Zawartość
        </p>

        <h1 className="mt-3 text-4xl font-bold">
          Kursy
        </h1>

        <p className="mt-4 text-zinc-400">
          Najpierw utwórz kurs. Następnie
          dodasz do niego moduły i lekcje.
        </p>
      </header>

      <div className="mt-10 grid gap-8 xl:grid-cols-[1fr_420px]">
        <section>
          <h2 className="text-xl font-semibold">
            Istniejące kursy
          </h2>

          <div className="mt-5 space-y-4">
            {isLoading && (
              <p className="text-zinc-400">
                Pobieranie kursów...
              </p>
            )}

            {!isLoading &&
              courses.length === 0 && (
                <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-zinc-400">
                  Nie utworzono jeszcze żadnego
                  kursu.
                </div>
              )}

            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/admin/courses/${course.id}`}
                className="block rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-zinc-600"
              >
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {course.title}
                    </h3>

                    <p className="mt-2 text-sm text-zinc-400">
                    {getSubjectLabel(
                    course.subject as CourseSubject | null,
                    )}
                      {" · "}
                    {getLevelLabel(
                    course.level as CourseLevel | null,
                    )}
                    </p>

                    {course.description && (
                      <p className="mt-3 line-clamp-2 text-sm text-zinc-500">
                        {course.description}
                      </p>
                    )}
                  </div>

                  <span
                    className={
                      course.published
                        ? "rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-300"
                        : "rounded-full bg-yellow-500/10 px-3 py-1 text-xs text-yellow-300"
                    }
                  >
                    {course.published
                      ? "Opublikowany"
                      : "Szkic"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="h-fit rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-xl font-semibold">
            Dodaj kurs
          </h2>

          <form
            onSubmit={handleCreateCourse}
            className="mt-6 space-y-5"
          >
            <div>
              <label
                htmlFor="courseTitle"
                className="mb-2 block text-sm text-zinc-300"
              >
                Nazwa kursu
              </label>

              <input
                id="courseTitle"
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value,
                  )
                }
                disabled={isSaving}
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none transition focus:border-white disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Matematyka rozszerzona"
              />
            </div>

            <div>
              <label
                htmlFor="courseSubject"
                className="mb-2 block text-sm text-zinc-300"
              >
                Przedmiot
              </label>

              <select
                id="courseSubject"
                value={subject}
                onChange={(event) =>
                  setSubject(
                    event.target
                      .value as CourseSubject,
                  )
                }
                disabled={isSaving}
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none transition focus:border-white disabled:cursor-not-allowed disabled:opacity-50"
              >
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
            </div>

            <div>
              <label
                htmlFor="courseLevel"
                className="mb-2 block text-sm text-zinc-300"
              >
                Poziom
              </label>

              <select
                id="courseLevel"
                value={level}
                onChange={(event) =>
                  setLevel(
                    event.target
                      .value as CourseLevel,
                  )
                }
                disabled={isSaving}
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none transition focus:border-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="BASIC">
                  Podstawowy
                </option>

                <option value="EXTENDED">
                  Rozszerzony
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="courseDescription"
                className="mb-2 block text-sm text-zinc-300"
              >
                Opis
              </label>

              <textarea
                id="courseDescription"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                disabled={isSaving}
                rows={5}
                className="w-full resize-none rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none transition focus:border-white disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Krótki opis kursu..."
              />
            </div>

            <button
              type="submit"
              disabled={
                isSaving ||
                !title.trim()
              }
              className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "Tworzenie..."
                : "Utwórz kurs"}
            </button>
          </form>

          {statusMessage && (
            <p className="mt-4 rounded-xl border border-zinc-700 bg-black p-3 text-sm text-zinc-300">
              {statusMessage}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}