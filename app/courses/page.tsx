import CourseCard from "@/components/CourseCard";
import { courses } from "@/data/courses";

export default function CoursesPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-16">
      <div className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-400">
          Wszystkie kursy
        </p>

        <h1 className="mt-3 text-4xl font-bold">
          Matematyka, fizyka i informatyka
        </h1>

        <p className="mt-4 text-lg text-zinc-400">
          Jeden abonament daje dostęp do całej biblioteki kursów.
        </p>
      </div>

      <section className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </section>
    </main>
  );
}