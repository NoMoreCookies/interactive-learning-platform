import { notFound } from "next/navigation";
import { findLessonBySlug } from "@/lib/courses";
import LatexContent from "@/components/lessons/LatexContent";
import LessonNotes from "@/components/lessons/LessonNotes";

type LessonPageProps = {
  params: Promise<{
    slug: string;
    lessonSlug: string;
  }>;
};

export default async function LessonPage({
  params,
}: LessonPageProps) {
  const { slug, lessonSlug } = await params;

  const result = findLessonBySlug(slug, lessonSlug);

  if (!result) {
    notFound();
  }

  const { course, courseModule, lesson } = result;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <p className="text-sm text-zinc-400">
        {course.title}
      </p>

      <h1 className="mt-2 text-4xl font-bold">
        {lesson.title}
      </h1>

      <p className="mt-4 text-lg text-zinc-300">
        {lesson.description}
      </p>

      <section className="mt-10">
        <video
          controls
          preload="metadata"
          className="w-full rounded-2xl bg-black"
        >
          <source src={lesson.videoPath} type="video/mp4" />
          Twoja przeglądarka nie obsługuje odtwarzania wideo.
        </video>
        <section className="mt-10 rounded-2xl border border-zinc-800 p-6">
          <LessonNotes notes={lesson.notes} />
        </section>
      </section>
              <a
              href={lesson.materialsPath}
              download
              className="inline-block rounded-xl bg-white px-5 py-3 font-medium text-black"
              >
              Pobierz materiały z lekcji
            </a>
    </main>
  );
}