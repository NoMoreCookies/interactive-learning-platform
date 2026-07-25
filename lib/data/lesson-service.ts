import { amplifyClient } from "@/lib/amplify-client";
import { getCourseStructure } from "@/lib/data/course-service";

export async function getLessonPageData(
  courseSlug: string,
  lessonSlug: string,
) {
  /*
   * Pobieramy kurs wraz z opublikowanymi modułami
   * i lekcjami.
   */
  const course = await getCourseStructure(courseSlug);

  if (!course) {
    return null;
  }

  /*
   * Spłaszczamy wszystkie lekcje ze wszystkich modułów.
   * Dzięki temu możemy:
   * - znaleźć aktualną lekcję,
   * - policzyć jej numer,
   * - znaleźć poprzednią i następną lekcję.
   */
  const lessonsWithModules = course.modules.flatMap(
    (courseModule) =>
      courseModule.lessons.map((lesson) => ({
        lesson,
        courseModule,
      })),
  );

  const currentLessonIndex =
    lessonsWithModules.findIndex(
      ({ lesson }) => lesson.slug === lessonSlug,
    );

  if (currentLessonIndex === -1) {
    return null;
  }

  const currentItem =
    lessonsWithModules[currentLessonIndex];

  const previousItem =
    currentLessonIndex > 0
      ? lessonsWithModules[currentLessonIndex - 1]
      : null;

  const nextItem =
    currentLessonIndex < lessonsWithModules.length - 1
      ? lessonsWithModules[currentLessonIndex + 1]
      : null;

  /*
   * Pobieramy notatki przypisane do aktualnej lekcji.
   */
  const notesResult =
    await amplifyClient.models.LessonNote.list({
      filter: {
        lessonId: {
          eq: currentItem.lesson.id,
        },
      },
    });

  if (notesResult.errors?.length) {
    console.error(
      "Błąd pobierania notatek:",
      notesResult.errors,
    );

    throw new Error(
      "Nie udało się pobrać notatek.",
    );
  }

  /*
   * Pobieramy zadania przypisane do aktualnej lekcji.
   */
  const tasksResult =
    await amplifyClient.models.LessonTask.list({
      filter: {
        lessonId: {
          eq: currentItem.lesson.id,
        },
      },
    });

  if (tasksResult.errors?.length) {
    console.error(
      "Błąd pobierania zadań:",
      tasksResult.errors,
    );

    throw new Error(
      "Nie udało się pobrać zadań.",
    );
  }

  const notes = [...notesResult.data].sort(
    (firstNote, secondNote) =>
      firstNote.order - secondNote.order,
  );

  const tasks = [...tasksResult.data].sort(
    (firstTask, secondTask) =>
      firstTask.order - secondTask.order,
  );

  return {
    course,
    courseModule: currentItem.courseModule,

    lesson: {
      ...currentItem.lesson,
      notes,
      tasks,
    },

    navigation: {
      lessonNumber: currentLessonIndex + 1,
      totalLessons: lessonsWithModules.length,

      previousLesson: previousItem
        ? {
            slug: previousItem.lesson.slug,
            title: previousItem.lesson.title,
          }
        : null,

      nextLesson: nextItem
        ? {
            slug: nextItem.lesson.slug,
            title: nextItem.lesson.title,
          }
        : null,
    },
  };
}