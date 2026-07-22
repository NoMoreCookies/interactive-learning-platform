import { courses } from "@/data/courses";

export function findCourseBySlug(courseSlug: string) {
  return courses.find((course) => course.slug === courseSlug);
}

export function findLessonBySlug(
  courseSlug: string,
  lessonSlug: string
) {
  const course = findCourseBySlug(courseSlug);

  if (!course) {
    return undefined;
  }

  for (const courseModule of course.modules) {
    const lesson = courseModule.lessons.find(
      (lesson) => lesson.slug === lessonSlug
    );

    if (lesson) {
      return {
        course,
        courseModule,
        lesson,
      };
    }
  }

  return undefined;
}