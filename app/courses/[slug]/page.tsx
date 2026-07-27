"use client";

import Image from "next/image";
import { use, useEffect, useState } from "react";

import CourseModuleAccordion from "@/components/courses/CourseModuleAccordion";
import { getCourseStructure } from "@/lib/services/course-service";

type CoursePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type CourseStructure = NonNullable<
  Awaited<ReturnType<typeof getCourseStructure>>
>;

type CourseIllustrations = {
  left: string;
  right: string;
};

function getCourseIllustrations(
  subject: CourseStructure["subject"],
): CourseIllustrations {
  switch (subject) {
    case "MATHEMATICS":
      return {
        left: "/courses/mathematics-left.png",
        right: "/courses/mathematics-right.png",
      };

    case "PHYSICS":
      return {
        left: "/courses/physics-left.png",
        right: "/courses/physics-right.png",
      };

    case "COMPUTER_SCIENCE":
      return {
        left: "/courses/computer-science-left.png",
        right: "/courses/computer-science-right.png",
      };

    default:
      return {
        left: "/categories/mathematics-3d.png",
        right: "/categories/mathematics-3d.png",
      };
  }
}

export default function CoursePage({
  params,
}: CoursePageProps) {
  const { slug } = use(params);

  const [course, setCourse] =
    useState<CourseStructure | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadCourse() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        console.log("Pobieram strukturę kursu:", slug);

        const result = await getCourseStructure(slug);

        console.log("Struktura kursu z AWS:", result);

        if (!result) {
          setErrorMessage("Nie znaleziono takiego kursu.");
          return;
        }

        setCourse(result);
      } catch (error) {
        console.error(
          "Błąd pobierania struktury kursu:",
          error,
        );

        setErrorMessage(
          "Nie udało się pobrać kursu.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCourse();
  }, [slug]);

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-6 py-20">
        <p className="text-zinc-400">
          Pobieranie kursu...
        </p>
      </main>
    );
  }

  if (errorMessage || !course) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-6 py-20">
        <h1 className="text-3xl font-bold">
          Nie znaleziono kursu
        </h1>

        <p className="mt-4 text-zinc-400">
          {errorMessage ||
            "Wybrany kurs nie istnieje."}
        </p>
      </main>
    );
  }

  const illustrations =
    getCourseIllustrations(course.subject);

  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden">
        <div className="mx-auto grid min-h-[320px] max-w-7xl grid-cols-1 items-center px-6 py-10 lg:grid-cols-[1fr_1.5fr_1fr]">
          <div className="hidden justify-start lg:flex">
            <Image
              src={illustrations.left}
              alt=""
              width={360}
              height={360}
              priority
              className="h-auto w-full max-w-[340px] object-contain opacity-60"
            />
          </div>

          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {course.title}
            </h1>

            {course.description && (
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-zinc-300">
                {course.description}
              </p>
            )}
          </div>

          <div className="hidden justify-end lg:flex">
            <Image
              src={illustrations.right}
              alt=""
              width={360}
              height={360}
              priority
              className="h-auto w-full max-w-[340px] object-contain opacity-60"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-6">
        {course.modules.length > 0 ? (
          <div className="space-y-4">
            {course.modules.map(
              (courseModule, moduleIndex) => (
                <CourseModuleAccordion
                  key={courseModule.id}
                  courseSlug={course.slug}
                  moduleNumber={courseModule.order}
                  title={courseModule.title}
                  description={
                    courseModule.description ?? ""
                  }
                  lessons={courseModule.lessons}
                  defaultOpen={moduleIndex === 0}
                />
              ),
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-10 text-center">
            <p className="text-zinc-400">
              Ten kurs nie zawiera jeszcze modułów.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}