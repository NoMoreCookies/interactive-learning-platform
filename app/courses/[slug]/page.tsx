import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findCourseBySlug } from "@/lib/courses";
import CourseModuleAccordion from "@/components/courses/CourseModuleAccordion";

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
    <main className="min-h-screen">
      <section className="relative overflow-hidden">
        <div className="mx-auto grid min-h-[320px] max-w-7xl grid-cols-1 items-center px-6 py-10 lg:grid-cols-[1fr_1.5fr_1fr]">
          <div className="hidden justify-start lg:flex">
            <Image
              src={course.illustrations.left}
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

            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-zinc-300">
              {course.description}
            </p>
          </div>

          <div className="hidden justify-end lg:flex">
            <Image
              src={course.illustrations.right}
              alt=""
              width={360}
              height={360}
              priority
              className="h-auto w-full max-w-[340px] object-contain opacity-60"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6 pb-16 pt-6">
        <div className="space-y-4">
          {course.modules.map((courseModule, moduleIndex) => (
            <div className="space-y-4">
              {course.modules.map((courseModule, moduleIndex) => (
                <CourseModuleAccordion
                  key={courseModule.id}
                  courseSlug={course.slug}
                  moduleNumber={courseModule.order}
                  title={courseModule.title}
                  description={courseModule.description}
                  lessons={courseModule.lessons}
                  defaultOpen={moduleIndex === 0}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}