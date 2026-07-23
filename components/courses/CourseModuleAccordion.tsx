"use client";

import Link from "next/link";
import { useState } from "react";

type Lesson = {
  id: string;
  slug: string;
  order: number;
  title: string;
  description: string;
};

type CourseModuleAccordionProps = {
  courseSlug: string;
  moduleNumber: number;
  title: string;
  description?: string;
  lessons: Lesson[];
  defaultOpen?: boolean;
};

export default function CourseModuleAccordion({
  courseSlug,
  moduleNumber,
  title,
  description,
  lessons,
  defaultOpen = false,
}: CourseModuleAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/30">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between gap-6 p-6 text-left transition hover:bg-zinc-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500"
      >
        <div className="flex items-start gap-5">
          <span className="pt-1 text-sm font-medium text-zinc-500">
            {String(moduleNumber).padStart(2, "0")}
          </span>

          <div>
            <h2 className="text-xl font-semibold text-zinc-100">
              {title}
            </h2>

            {description && (
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <span className="hidden text-sm text-zinc-500 sm:block">
            {lessons.length} {lessons.length === 1 ? "lekcja" : "lekcje"}
          </span>

          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={`h-5 w-5 text-zinc-400 transition-transform duration-500 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="m6 9 6 6 6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`space-y-3 border-t border-zinc-800 p-4 transition-opacity duration-500 sm:p-6 ${
              isOpen ? "opacity-100" : "opacity-0"
            }`}
          >
            {lessons.map((lesson) => (
              <Link
                key={lesson.id}
                href={`/courses/${courseSlug}/${lesson.slug}`}
                className="block rounded-xl border border-zinc-800 p-5 transition-all hover:border-zinc-600 hover:bg-zinc-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
              >
                <p className="text-sm text-zinc-500">
                  Lekcja {lesson.order}
                </p>

                <h3 className="mt-1 text-lg font-medium text-zinc-100">
                  {lesson.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {lesson.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}