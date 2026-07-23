import { notFound } from "next/navigation";

import LessonNavigation from "@/components/lessons/LessonNavigation";
import LessonNotes from "@/components/lessons/LessonNotes";
import LessonTasks from "@/components/lessons/LessonTasks";
import {
  findLessonBySlug,
  getLessonNavigation,
} from "@/lib/courses";

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

  const navigation = getLessonNavigation(
    course.slug,
    lesson.slug
  );

  if (!navigation) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <header>
        <p className="text-sm text-zinc-400">
          {course.title}
        </p>

        <h1 className="mt-2 text-4xl font-bold">
          {lesson.title}
        </h1>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-400">
          <span>
            Lekcja {navigation.lessonNumber} z{" "}
            {navigation.totalLessons}
          </span>

          <span>
            Moduł: {courseModule.title}
          </span>

          <span>
            {lesson.durationMinutes} min
          </span>
        </div>

        <p className="mt-4 text-lg text-zinc-300">
          {lesson.description}
        </p>
      </header>

      <section className="mt-10">
        <video
          controls
          preload="metadata"
          className="w-full rounded-2xl bg-black"
        >
          <source
            src={lesson.videoPath}
            type="video/mp4"
          />

          Twoja przeglądarka nie obsługuje odtwarzania wideo.
        </video>
      </section>

      <section className="mt-10 rounded-2xl border border-zinc-800 p-6">
        <LessonNotes notes={lesson.notes} />

        <LessonTasks tasks={lesson.tasks} />
      </section>

    {lesson.materialsPath && (
      <section className="mt-10 flex justify-center">
        <a
          href={lesson.materialsPath}
          download
          className="
            group
            flex
            w-full
            max-w-md
            cursor-pointer
            items-center
            justify-center
            gap-3
            rounded-2xl
            border-2
            border-white
            bg-zinc-950
            px-6
            py-5
            text-center
            text-lg
            font-medium
            text-white
            transition-all
            duration-200
            hover:bg-zinc-900
            hover:shadow-[0_0_24px_rgba(255,255,255,0.10)]
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-white
            focus-visible:ring-offset-2
            focus-visible:ring-offset-black
          "
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="h-6 w-6 transition-transform duration-200 group-hover:translate-y-0.5"
          >
            <path
              d="M12 3v12m0 0 5-5m-5 5-5-5M5 17v3h14v-3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <span>Pobierz materiały z lekcji</span>
        </a>
      </section>
    )}

      <LessonNavigation
        courseSlug={course.slug}
        previousLesson={navigation.previousLesson}
        nextLesson={navigation.nextLesson}
      />
    </main>
  );
}