import Link from "next/link";

import type { Schema } from "@/amplify/data/resource";

type Course = Schema["Course"]["type"];

type CourseCardProps = {
  course: Course;
};

export default function CourseCard({
  course,
}: CourseCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <h2 className="mt-2 text-2xl font-semibold">
        {course.title}
      </h2>

      {course.description && (
        <p className="mt-3 text-zinc-300">
          {course.description}
        </p>
      )}

      <Link
        href={`/courses/${course.slug}`}
        className="mt-6 inline-block rounded-xl bg-white px-5 py-3 font-medium text-black"
      >
        Zobacz kurs
      </Link>
    </article>
  );
}