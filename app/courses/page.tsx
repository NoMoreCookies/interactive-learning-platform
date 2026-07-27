"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import CourseCard from "@/components/courses/CourseCard";
import { useEffect } from "react";

import { getPublishedCourses } from "@/lib/services/course-service";
import type { Schema } from "@/amplify/data/resource";

type Subject =
  | "MATHEMATICS"
  | "PHYSICS"
  | "COMPUTER_SCIENCE";

type SubjectOption = {
  value: Subject;
  label: string;
  icon: string;
};

type Course = Schema["Course"]["type"];

const subjectOptions: SubjectOption[] = [
  {
    value: "MATHEMATICS",
    label: "Matematyka",
    icon: "/categories/mathematics-3d.png",
  },
  {
    value: "PHYSICS",
    label: "Fizyka",
    icon: "/categories/physics-3d.png",
  },
  {
    value: "COMPUTER_SCIENCE",
    label: "Informatyka",
    icon: "/categories/computer-science-3d.png",
  },
];

function getSubjectCardClasses(
  subject: Subject,
  isSelected: boolean
): string {
  if (!isSelected) {
    return [
      "border-zinc-800",
      "bg-zinc-950/30",
      "hover:-translate-y-1",
      "hover:border-zinc-600",
      "hover:bg-zinc-900/40",
    ].join(" ");
  }

  switch (subject) {
    case "MATHEMATICS":
      return [
        "border-blue-500",
        "bg-blue-500/10",
        "shadow-lg",
        "shadow-blue-950/30",
      ].join(" ");

    case "PHYSICS":
      return [
        "border-amber-500",
        "bg-amber-500/10",
        "shadow-lg",
        "shadow-amber-950/20",
      ].join(" ");

    case "COMPUTER_SCIENCE":
      return [
        "border-emerald-500",
        "bg-emerald-500/10",
        "shadow-lg",
        "shadow-emerald-950/20",
      ].join(" ");
  }
}

function getSubjectTextClass(subject: Subject): string {
  switch (subject) {
    case "MATHEMATICS":
      return "text-blue-400";

    case "PHYSICS":
      return "text-amber-400";

    case "COMPUTER_SCIENCE":
      return "text-emerald-400";
  }
}

function getSubjectBorderClass(subject: Subject): string {
  switch (subject) {
    case "MATHEMATICS":
      return "border-blue-500";

    case "PHYSICS":
      return "border-amber-500";

    case "COMPUTER_SCIENCE":
      return "border-emerald-500";
  }
}

export default function CoursesPage() {
  const [selectedSubject, setSelectedSubject] =
    useState<Subject>("MATHEMATICS");

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadCourses() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        console.log("=== Pobieram kursy z AWS ===");

        const result = await getPublishedCourses();

        console.log("=== Wynik z AWS ===");
        console.log(result);

        setCourses(result);
      } catch (error) {
        console.error("=== BŁĄD ===");
        console.error(error);

        setErrorMessage("Nie udało się pobrać kursów.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadCourses();
  }, []);
  
  const coursesSectionRef = useRef<HTMLElement>(null);

  const filteredCourses = courses.filter(
    (course) => course.subject === selectedSubject
  );

  const selectedSubjectLabel = subjectOptions.find(
    (subject) => subject.value === selectedSubject
  )?.label;

  function handleSubjectSelect(subject: Subject) {
  setSelectedSubject(subject);

  setTimeout(() => {
    const section = coursesSectionRef.current;

    if (!section) return;

    const offset = 80;

    const y =
      section.getBoundingClientRect().top +
      window.scrollY -
      offset;

    window.scrollTo({
      top: y,
      behavior: "smooth",
      });
    }, 25);
  }
  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-20">
        <p>Pobieranie kursów...</p>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-red-400">{errorMessage}</p>
      </main>
    );
  }
  return (
    <>
      

      <main className="mx-auto min-h-screen max-w-6xl px-6 pb-20 pt-14">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
            Wszystkie kursy
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Wybierz kategorię
          </h1>

          <p className="mt-4 text-lg leading-8 text-zinc-400">
            Matematyka, fizyka i informatyka w jednym miejscu.
          </p>
        </div>

        <div className="mt-12 flex gap-6 overflow-x-auto pb-4">
          {subjectOptions.map((subject) => {
            const isSelected =
              selectedSubject === subject.value;

            const subjectColor =
              getSubjectTextClass(subject.value);

            const subjectBorder =
              getSubjectBorderClass(subject.value);

            return (
              <button
                key={subject.value}
                type="button"
                onClick={() =>
                  handleSubjectSelect(subject.value)
                }
                aria-pressed={isSelected}
                            className={`group h-[300px] w-[320px] shrink-0 rounded-2xl border p-7 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617] ${getSubjectCardClasses(
                subject.value,
                isSelected
              )}`}
              >
                <div className="flex h-full flex-col">
                <Image
                  src={subject.icon}
                  alt=""
                  width={220}
                  height={220}
                  className="h-36 w-36 object-contain transition-transform duration-300 group-hover:scale-105"
                />

                  <h2 className="mt-5 text-2xl font-semibold text-zinc-100">
                    {subject.label}
                  </h2>

                  <span
                    className={`mt-auto flex h-10 w-10 items-center justify-center rounded-full border ${subjectBorder} ${subjectColor} transition-transform duration-300 group-hover:translate-y-1`}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M12 5v14m-6-6 6 6 6-6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <section
            ref={coursesSectionRef}
            className="mt-14"
          >
          <div className="mb-6 flex items-end justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-widest text-zinc-500">
                Dostępne kursy
              </p>

              <h2
                className={`mt-2 text-2xl font-semibold ${getSubjectTextClass(
                  selectedSubject
                )}`}
              >
                {selectedSubjectLabel}
              </h2>
            </div>

            <p className="text-sm text-zinc-500">
              {filteredCourses.length}{" "}
              {filteredCourses.length === 1
                ? "kurs"
                : "kursy"}
            </p>
          </div>

          <div
            key={selectedSubject}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course, index) => (
                <div
                  key={course.id}
                  className="animate-course-card"
                  style={{
                    animationDelay: `${index * 80}ms`,
                  }}
                >
                  <CourseCard course={course} />
                </div>
              ))
            ) : (
              <div className="animate-course-card col-span-full rounded-2xl border border-zinc-800 bg-zinc-950/30 p-10 text-center">
                <p className="text-zinc-400">
                  W tej kategorii nie ma jeszcze dostępnych kursów.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}