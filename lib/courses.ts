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

export function getLessonNavigation(
  courseSlug: string,
  lessonSlug: string
) {
  const course = findCourseBySlug(courseSlug);

  if (!course) {
    return undefined;
  }

  const allLessons = course.modules.flatMap(
    (courseModule) => courseModule.lessons
  );

  const currentIndex = allLessons.findIndex(
    (lesson) => lesson.slug === lessonSlug
  );

  if (currentIndex === -1) {
    return undefined;
  }

  return {
    previousLesson:
      currentIndex > 0
        ? allLessons[currentIndex - 1]
        : undefined,

    nextLesson:
      currentIndex < allLessons.length - 1
        ? allLessons[currentIndex + 1]
        : undefined,

    lessonNumber: currentIndex + 1,
    totalLessons: allLessons.length,
  };
}