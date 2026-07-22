import Link from "next/link";
import { notFound } from "next/navigation";
import { findCourseBySlug } from "@/lib/courses";

type CoursePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CoursePage({
  params,
}: CoursePageProps) {
  const { slug } = await params;
  const course = findCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-16">
      <p className="text-sm uppercase tracking-widest text-zinc-400">
        {course.level}
      </p>

      <h1 className="mt-3 text-4xl font-bold">
        {course.title}
      </h1>

      <p className="mt-5 text-lg text-zinc-300">
        {course.description}
      </p>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Lekcje</h2>

        <div className="space-y-8">
  {course.modules.map((courseModule) => (
    <section key={courseModule.id}>
      <h2 className="text-2xl font-semibold">
        {courseModule.title}
      </h2>

      {courseModule.description && (
        <p className="mt-2 text-zinc-400">
          {courseModule.description}
        </p>
      )}

              <div className="mt-4 space-y-3">
                {courseModule.lessons.map((lesson, index) => (
                  <Link
                    key={lesson.id}
                    href={`/courses/${course.slug}/${lesson.slug}`}
                    className="block rounded-xl border border-zinc-800 p-5 transition hover:border-zinc-600"
                  >
                    <p className="text-sm text-zinc-500">
                      Lekcja {lesson.order}
                    </p>

                    <h3 className="mt-1 text-xl font-medium">
                      {lesson.title}
                    </h3>

                    <p className="mt-2 text-zinc-400">
                      {lesson.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

    </main>
  );
}