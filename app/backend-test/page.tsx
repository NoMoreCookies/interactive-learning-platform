"use client";

import { useEffect, useState } from "react";

import type { Schema } from "@/amplify/data/resource";
import { amplifyClient as client } from "@/lib/amplify-client";

type Course = Schema["Course"]["type"];

export default function BackendTestPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");
  

  async function loadCourses() {
    setIsLoading(true);
    setMessage("");

    try {
      const { data, errors } = await client.models.Course.list();

      if (errors?.length) {
        console.error("Błędy Amplify:", errors);
        setMessage("Nie udało się pobrać kursów.");
        return;
      }

      const sortedCourses = [...data].sort(
        (firstCourse, secondCourse) =>
          firstCourse.order - secondCourse.order,
      );

      setCourses(sortedCourses);
    } catch (error) {
      console.error("Nieoczekiwany błąd:", error);
      setMessage("Wystąpił nieoczekiwany błąd podczas pobierania danych.");
    } finally {
      setIsLoading(false);
    }
  }

    async function createFullTestData() {
    console.log("0. START createFullTestData");

    setIsCreating(true);
    setMessage("");

    try {
        console.log("1. Szukam kursu");

        const courseSearchResult =
        await client.models.Course.list({
            filter: {
            slug: {
                eq: "matematyka-rozszerzona",
            },
            },
        });

        console.log(
        "2. Wynik wyszukiwania kursu:",
        courseSearchResult,
        );

        if (courseSearchResult.errors?.length) {
        console.error(
            "Błąd sprawdzania kursu:",
            courseSearchResult.errors,
        );

        setMessage(
            "Nie udało się sprawdzić, czy kurs już istnieje.",
        );

        return;
        }

        let course = courseSearchResult.data[0];

        if (!course) {
        console.log("3. Kurs nie istnieje — tworzę kurs");

        const courseResult =
            await client.models.Course.create({
            title: "Matematyka rozszerzona",
            slug: "matematyka-rozszerzona",
            description:
                "Kompleksowy kurs przygotowujący do matury rozszerzonej.",
            subject: "MATHEMATICS",
            level: "Matura rozszerzona",
            thumbnailPath: "/images/matematyka.png",
            order: 1,
            published: true,
            });

        console.log(
            "4. Wynik tworzenia kursu:",
            courseResult,
        );

        if (
            courseResult.errors?.length ||
            !courseResult.data
        ) {
            console.error(
            "Błąd tworzenia kursu:",
            courseResult.errors,
            );

            setMessage("Nie udało się utworzyć kursu.");
            return;
        }

        course = courseResult.data;
        }

        console.log("5. Kurs gotowy:", course);

        console.log("6. Szukam modułu");

        const moduleSearchResult =
        await client.models.Module.list({
            filter: {
            courseId: {
                eq: course.id,
            },
            slug: {
                eq: "funkcje",
            },
            },
        });

        console.log(
        "7. Wynik wyszukiwania modułu:",
        moduleSearchResult,
        );

        if (moduleSearchResult.errors?.length) {
        console.error(
            "Błąd sprawdzania modułu:",
            moduleSearchResult.errors,
        );

        setMessage(
            "Nie udało się sprawdzić, czy moduł już istnieje.",
        );

        return;
        }

        let courseModule = moduleSearchResult.data[0];

        if (!courseModule) {
        console.log("8. Moduł nie istnieje — tworzę moduł");

        const moduleResult =
            await client.models.Module.create({
            courseId: course.id,
            title: "Funkcje",
            slug: "funkcje",
            description:
                "Najważniejsze zagadnienia dotyczące funkcji.",
            order: 1,
            published: true,
            });

        console.log(
            "9. Wynik tworzenia modułu:",
            moduleResult,
        );

        if (
            moduleResult.errors?.length ||
            !moduleResult.data
        ) {
            console.error(
            "Błąd tworzenia modułu:",
            moduleResult.errors,
            );

            setMessage("Nie udało się utworzyć modułu.");
            return;
        }

        courseModule = moduleResult.data;
        }

        console.log("10. Moduł gotowy:", courseModule);

        console.log("11. Szukam lekcji");

        const lessonSearchResult =
        await client.models.Lesson.list({
            filter: {
            moduleId: {
                eq: courseModule.id,
            },
            slug: {
                eq: "funkcja-kwadratowa",
            },
            },
        });

        console.log(
        "12. Wynik wyszukiwania lekcji:",
        lessonSearchResult,
        );

        if (lessonSearchResult.errors?.length) {
        console.error(
            "Błąd sprawdzania lekcji:",
            lessonSearchResult.errors,
        );

        setMessage(
            "Nie udało się sprawdzić, czy lekcja już istnieje.",
        );

        return;
        }

        let lesson = lessonSearchResult.data[0];

        if (!lesson) {
        console.log("13. Lekcja nie istnieje — tworzę lekcję");

        const lessonResult =
            await client.models.Lesson.create({
            moduleId: courseModule.id,
            title: "Funkcja kwadratowa",
            slug: "funkcja-kwadratowa",
            description:
                "Wprowadzenie do funkcji kwadratowej i jej najważniejszych własności.",
            durationMinutes: 28,
            order: 1,
            videoPath: "/videos/mat12.mp4",
            materialsPath:
                "/materials/funkcja-kwadratowa.zip",
            published: true,
            });

        console.log(
            "14. Wynik tworzenia lekcji:",
            lessonResult,
        );

        if (
            lessonResult.errors?.length ||
            !lessonResult.data
        ) {
            console.error(
            "Błąd tworzenia lekcji:",
            lessonResult.errors,
            );

            setMessage("Nie udało się utworzyć lekcji.");
            return;
        }

        lesson = lessonResult.data;
        }

        console.log("15. Lekcja gotowa:", lesson);

        console.log("16. Szukam notatek");

        const notesSearchResult =
        await client.models.LessonNote.list({
            filter: {
            lessonId: {
                eq: lesson.id,
            },
            },
        });

        console.log(
        "17. Wynik wyszukiwania notatek:",
        notesSearchResult,
        );

        if (notesSearchResult.errors?.length) {
        console.error(
            "Błąd sprawdzania notatek:",
            notesSearchResult.errors,
        );

        setMessage(
            "Nie udało się sprawdzić istniejących notatek.",
        );

        return;
        }

        const existingNoteTitles = new Set(
        notesSearchResult.data.map((note) => note.title),
        );

        const noteRequests = [];

        if (!existingNoteTitles.has("Postać ogólna")) {
        console.log("18. Tworzę notatkę: Postać ogólna");

        noteRequests.push(
            client.models.LessonNote.create({
            lessonId: lesson.id,
            title: "Postać ogólna",
            content:
                "Funkcja kwadratowa ma postać: $$f(x)=ax^2+bx+c$$, gdzie $$a\\neq 0$$.",
            order: 1,
            }),
        );
        }

        if (!existingNoteTitles.has("Delta")) {
        console.log("19. Tworzę notatkę: Delta");

        noteRequests.push(
            client.models.LessonNote.create({
            lessonId: lesson.id,
            title: "Delta",
            content:
                "Wyróżnik trójmianu kwadratowego obliczamy ze wzoru: $$\\Delta=b^2-4ac$$.",
            order: 2,
            }),
        );
        }

        const noteResults = await Promise.all(noteRequests);

        console.log(
        "20. Wyniki tworzenia notatek:",
        noteResults,
        );

        const noteErrors = noteResults.flatMap(
        (result) => result.errors ?? [],
        );

        if (noteErrors.length > 0) {
        console.error(
            "Błędy tworzenia notatek:",
            noteErrors,
        );

        setMessage(
            "Struktura została częściowo utworzona, ale wystąpił błąd przy notatkach.",
        );

        return;
        }

        console.log("21. Szukam zadań");

        const tasksSearchResult =
        await client.models.LessonTask.list({
            filter: {
            lessonId: {
                eq: lesson.id,
            },
            },
        });

        console.log(
        "22. Wynik wyszukiwania zadań:",
        tasksSearchResult,
        );

        if (tasksSearchResult.errors?.length) {
        console.error(
            "Błąd sprawdzania zadań:",
            tasksSearchResult.errors,
        );

        setMessage(
            "Nie udało się sprawdzić istniejących zadań.",
        );

        return;
        }

        const taskAlreadyExists =
        tasksSearchResult.data.some(
            (task) => task.title === "Zadanie 1",
        );

        if (!taskAlreadyExists) {
        console.log("23. Tworzę zadanie");

        const taskResult =
            await client.models.LessonTask.create({
            lessonId: lesson.id,
            title: "Zadanie 1",
            content:
                "Oblicz deltę funkcji $$f(x)=x^2-5x+6$$.",
            answer: "$$\\Delta=1$$",
            solution:
                "$$a=1,\\ b=-5,\\ c=6$$, więc $$\\Delta=(-5)^2-4\\cdot1\\cdot6=1$$.",
            order: 1,
            });

        console.log(
            "24. Wynik tworzenia zadania:",
            taskResult,
        );

        if (
            taskResult.errors?.length ||
            !taskResult.data
        ) {
            console.error(
            "Błąd tworzenia zadania:",
            taskResult.errors,
            );

            setMessage(
            "Struktura została częściowo utworzona, ale wystąpił błąd przy zadaniu.",
            );

            return;
        }
        }

        console.log("25. Odświeżam listę kursów");

        await loadCourses();

        /*
        * Komunikat ustawiamy dopiero po loadCourses(),
        * ponieważ loadCourses() na początku wykonuje setMessage("").
        */
        setMessage(
        "Pełna struktura kursu została poprawnie utworzona.",
        );

        console.log("26. KONIEC — wszystkie dane są gotowe");
    } catch (error) {
        console.error(
        "BŁĄD W createFullTestData:",
        error,
        );

        setMessage(
        "Wystąpił nieoczekiwany błąd podczas tworzenia danych.",
        );
    } finally {
        setIsCreating(false);
    }
    }

  useEffect(() => {
    void loadCourses();
  }, []);

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-bold">
        Test backendu Amplify
      </h1>

      <p className="mt-2 text-zinc-400">
        Dane są pobierane przez AppSync z bazy DynamoDB.
      </p>

      <button
        type="button"
        onClick={createFullTestData}
        disabled={isCreating || isLoading}
        className="mt-8 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
    {isCreating
    ? "Tworzenie struktury..."
    : "Utwórz pełne dane testowe"}
      </button>

      {message && (
        <p className="mt-5 text-sm text-zinc-300">
          {message}
        </p>
      )}

      {isLoading && (
        <p className="mt-8 text-zinc-400">
          Pobieranie kursów...
        </p>
      )}

      {!isLoading && courses.length === 0 && (
        <p className="mt-8 text-zinc-400">
          Baza nie zawiera jeszcze żadnych kursów.
        </p>
      )}

      <div className="mt-8 grid gap-5">
        {courses.map((course) => (
          <article
            key={course.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {course.title}
                </h2>

                {course.description && (
                  <p className="mt-2 text-zinc-400">
                    {course.description}
                  </p>
                )}
              </div>

              <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs">
                {course.published
                  ? "Opublikowany"
                  : "Szkic"}
              </span>
            </div>

            <div className="mt-5 space-y-2 text-sm text-zinc-400">
              <p>
                <span className="font-medium text-zinc-200">
                  Slug:
                </span>{" "}
                {course.slug}
              </p>

              <p>
                <span className="font-medium text-zinc-200">
                  Przedmiot:
                </span>{" "}
                {course.subject ?? "Brak"}
              </p>

              <p className="break-all">
                <span className="font-medium text-zinc-200">
                  ID:
                </span>{" "}
                {course.id}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}