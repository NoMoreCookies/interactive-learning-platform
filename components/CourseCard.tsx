import Link from "next/link";
import type { Course } from "@/types/course";

type CourseCardProps = {
  course: Course;
};

export default function CourseCard({ course }: CourseCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <p className="text-sm text-zinc-400">{course.level}</p>

      <h2 className="mt-2 text-2xl font-semibold">
        {course.title}
      </h2>

      <p className="mt-3 text-zinc-300">
        {course.shortDescription}
      </p>

      <Link
        href={`/courses/${course.slug}`}
        className="mt-6 inline-block rounded-xl bg-white px-5 py-3 font-medium text-black"
      >
        Zobacz kurs
      </Link>
    </article>
  );
}