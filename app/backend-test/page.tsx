"use client";

import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";

import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

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

  async function createTestCourse() {
    setIsCreating(true);
    setMessage("");

    try {
      const existingCourse = courses.find(
        (course) => course.slug === "matematyka-rozszerzona",
      );

      if (existingCourse) {
        setMessage("Kurs testowy już istnieje.");
        return;
      }

      const { data, errors } = await client.models.Course.create({
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

      if (errors?.length) {
        console.error("Błędy tworzenia kursu:", errors);
        setMessage("Nie udało się utworzyć kursu.");
        return;
      }

      if (!data) {
        setMessage("Backend nie zwrócił utworzonego kursu.");
        return;
      }

      setMessage("Kurs został poprawnie utworzony.");
      await loadCourses();
    } catch (error) {
      console.error("Nieoczekiwany błąd:", error);
      setMessage("Wystąpił nieoczekiwany błąd podczas tworzenia kursu.");
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
        onClick={createTestCourse}
        disabled={isCreating || isLoading}
        className="mt-8 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCreating
          ? "Tworzenie kursu..."
          : "Utwórz kurs testowy"}
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