import {
  amplifyClient,
} from "@/lib/amplify-client";

import {
  getPublishedCourseOutline,
} from "@/lib/services/course-service";

export type PremiumLessonAssetType =
  | "VIDEO"
  | "MATERIALS";

export async function getPremiumLessonAssetUrl(
  lessonId: string,
  assetType: PremiumLessonAssetType,
) {
  const normalizedLessonId =
    lessonId.trim();

  if (!normalizedLessonId) {
    throw new Error(
      "Identyfikator lekcji nie może być pusty.",
    );
  }

  const { data, errors } =
    await amplifyClient.queries.getPremiumLessonAssetUrl(
      {
        lessonId:
          normalizedLessonId,
        assetType,
      },
      {
        authMode: "userPool",
      },
    );

  if (errors?.length) {
    console.error(
      "Nie udało się pobrać URL assetu lekcji:",
      errors,
    );

    throw new Error(
      "Nie udało się uzyskać dostępu do pliku.",
    );
  }

  return data ?? null;
}

export async function getLessonPageData(
  courseSlug: string,
  lessonSlug: string,
) {
  const normalizedCourseSlug =
    courseSlug.trim();

  const normalizedLessonSlug =
    lessonSlug.trim();

  if (
    !normalizedCourseSlug ||
    !normalizedLessonSlug
  ) {
    return null;
  }

  /*
   * Public lesson navigation is derived exclusively from the
   * publication-controlled public course outline.
   */
  const course =
    await getPublishedCourseOutline(
      normalizedCourseSlug,
    );

  if (!course) {
    return null;
  }

  const lessonsWithModules =
    course.modules.flatMap(
      (courseModule) =>
        courseModule.lessons.map(
          (lesson) => ({
            lesson,
            courseModule,
          }),
        ),
    );

  const currentLessonIndex =
    lessonsWithModules.findIndex(
      ({ lesson }) =>
        lesson.slug ===
        normalizedLessonSlug,
    );

  if (currentLessonIndex === -1) {
    return null;
  }

  const currentItem =
    lessonsWithModules[
      currentLessonIndex
    ];

  const previousItem =
    currentLessonIndex > 0
      ? lessonsWithModules[
          currentLessonIndex - 1
        ]
      : null;

  const nextItem =
    currentLessonIndex <
    lessonsWithModules.length - 1
      ? lessonsWithModules[
          currentLessonIndex + 1
        ]
      : null;

  return {
    course,

    courseModule:
      currentItem.courseModule,

    lesson:
      currentItem.lesson,

    navigation: {
      lessonNumber:
        currentLessonIndex + 1,

      totalLessons:
        lessonsWithModules.length,

      previousLesson:
        previousItem
          ? {
              slug:
                previousItem
                  .lesson.slug,

              title:
                previousItem
                  .lesson.title,
            }
          : null,

      nextLesson:
        nextItem
          ? {
              slug:
                nextItem
                  .lesson.slug,

              title:
                nextItem
                  .lesson.title,
            }
          : null,
    },
  };
}

export async function getPremiumLessonContent(
  lessonId: string,
) {
  const normalizedLessonId =
    lessonId.trim();

  if (!normalizedLessonId) {
    throw new Error(
      "Identyfikator lekcji nie może być pusty.",
    );
  }

  const { data, errors } =
    await amplifyClient.queries.getPremiumLessonContent(
      {
        lessonId:
          normalizedLessonId,
      },
      {
        authMode: "userPool",
      },
    );

  if (errors?.length) {
    console.error(
      "Błąd pobierania treści premium lekcji:",
      errors,
    );

    throw new Error(
      "Nie udało się pobrać treści premium lekcji.",
    );
  }

  if (!data) {
    return null;
  }

  const notes =
    (data.notes ?? []).filter(
      (
        note,
      ): note is NonNullable<
        typeof note
      > =>
        note !== null &&
        note !== undefined,
    );

  const tasks =
    (data.tasks ?? []).filter(
      (
        task,
      ): task is NonNullable<
        typeof task
      > =>
        task !== null &&
        task !== undefined,
    );

  return {
    ...data,
    notes,
    tasks,
  };
}

export async function getTaskAnswer(
  taskId: string,
) {
  const normalizedTaskId =
    taskId.trim();

  if (!normalizedTaskId) {
    throw new Error(
      "Identyfikator zadania nie może być pusty.",
    );
  }

  const { data, errors } =
    await amplifyClient.queries.getTaskAnswer(
      {
        taskId:
          normalizedTaskId,
      },
      {
        authMode: "userPool",
      },
    );

  if (errors?.length) {
    console.error(
      "Błąd pobierania odpowiedzi do zadania:",
      errors,
    );

    throw new Error(
      "Nie udało się pobrać odpowiedzi.",
    );
  }

  return data ?? null;
}

export async function getTaskSolution(
  taskId: string,
) {
  const normalizedTaskId =
    taskId.trim();

  if (!normalizedTaskId) {
    throw new Error(
      "Identyfikator zadania nie może być pusty.",
    );
  }

  const { data, errors } =
    await amplifyClient.queries.getTaskSolution(
      {
        taskId:
          normalizedTaskId,
      },
      {
        authMode: "userPool",
      },
    );

  if (errors?.length) {
    console.error(
      "Błąd pobierania rozwiązania zadania:",
      errors,
    );

    throw new Error(
      "Nie udało się pobrać rozwiązania.",
    );
  }

  return data ?? null;
}

export async function updateLessonMaterialsPath(
  lessonId: string,
  materialsPath: string,
) {
  const normalizedLessonId =
    lessonId.trim();

  const normalizedMaterialsPath =
    materialsPath.trim();

  if (!normalizedLessonId) {
    throw new Error(
      "Identyfikator lekcji nie może być pusty.",
    );
  }

  if (!normalizedMaterialsPath) {
    throw new Error(
      "Ścieżka materiałów nie może być pusta.",
    );
  }

  const result =
    await amplifyClient.models.Lesson.update(
      {
        id: normalizedLessonId,
        materialsPath:
          normalizedMaterialsPath,
      },
    );

  if (result.errors?.length) {
    console.error(
      "Błąd aktualizacji ścieżki materiałów:",
      result.errors,
    );

    throw new Error(
      "Nie udało się zapisać ścieżki materiałów.",
    );
  }

  if (!result.data) {
    throw new Error(
      "Amplify nie zwróciło zaktualizowanej lekcji.",
    );
  }

  return result.data;
}

export async function updateLessonVideoPath(
  lessonId: string,
  videoPath: string,
) {
  const normalizedLessonId =
    lessonId.trim();

  const normalizedVideoPath =
    videoPath.trim();

  if (!normalizedLessonId) {
    throw new Error(
      "Identyfikator lekcji nie może być pusty.",
    );
  }

  if (!normalizedVideoPath) {
    throw new Error(
      "Ścieżka filmu nie może być pusta.",
    );
  }

  const result =
    await amplifyClient.models.Lesson.update(
      {
        id: normalizedLessonId,
        videoPath:
          normalizedVideoPath,
      },
    );

  if (result.errors?.length) {
    console.error(
      "Błąd aktualizacji ścieżki filmu:",
      result.errors,
    );

    throw new Error(
      "Nie udało się zapisać ścieżki filmu.",
    );
  }

  if (!result.data) {
    throw new Error(
      "Amplify nie zwróciło zaktualizowanej lekcji.",
    );
  }

  return result.data;
}