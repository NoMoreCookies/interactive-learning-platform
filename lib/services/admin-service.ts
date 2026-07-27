import { amplifyClient } from "@/lib/amplify-client";
export type CourseSubject =
  | "MATHEMATICS"
  | "PHYSICS"
  | "COMPUTER_SCIENCE";

export type CourseLevel =
  | "BASIC"
  | "EXTENDED";

function sortByOrder<
  T extends {
    order?: number | null;
  },
>(items: T[]): T[] {
  return [...items].sort(
    (firstItem, secondItem) =>
      (firstItem.order ?? 0) -
      (secondItem.order ?? 0),
  );
}

/*
 * COURSES
 */

export async function getAdminCourses() {
  const { data, errors } =
    await amplifyClient.models.Course.list();

  if (errors?.length) {
    console.error(
      "Błąd pobierania kursów:",
      errors,
    );

    throw new Error(
      "Nie udało się pobrać kursów.",
    );
  }

  return sortByOrder(data);
}

export async function getAdminCourse(
  courseId: string,
) {
  const { data, errors } =
    await amplifyClient.models.Course.get({
      id: courseId,
    });

  if (errors?.length) {
    console.error(
      "Błąd pobierania kursu:",
      errors,
    );

    throw new Error(
      "Nie udało się pobrać kursu.",
    );
  }

  return data ?? null;
}

export async function createAdminCourse(input: {
  title: string;
  slug: string;
  description: string;
  subject: CourseSubject;
  level: CourseLevel;
  order: number;
  published: boolean;
}) {
  const { data, errors } =
    await amplifyClient.models.Course.create({
      ...input,
    });

  if (errors?.length) {
    console.error(
      "Błąd tworzenia kursu:",
      errors,
    );

    throw new Error(
      "Nie udało się utworzyć kursu.",
    );
  }

  if (!data) {
    throw new Error(
      "Amplify nie zwróciło utworzonego kursu.",
    );
  }

  return data;
}

export async function updateAdminCourse(input: {
  id: string;
  title: string;
  slug: string;
  description: string;
  subject: CourseSubject | null;
  level: CourseLevel | null;
  order: number;
  published: boolean;
}) {
  const { data, errors } =
    await amplifyClient.models.Course.update({
      ...input,
    });

  if (errors?.length) {
    console.error(
      "Błąd aktualizacji kursu:",
      errors,
    );

    throw new Error(
      "Nie udało się zaktualizować kursu.",
    );
  }

  if (!data) {
    throw new Error(
      "Amplify nie zwróciło zaktualizowanego kursu.",
    );
  }

  return data;
}

/*
 * MODULES
 */

export async function getAdminModulesByCourseId(
  courseId: string,
) {
  const { data, errors } =
    await amplifyClient.models.Module.list({
      filter: {
        courseId: {
          eq: courseId,
        },
      },
    });

  if (errors?.length) {
    console.error(
      "Błąd pobierania modułów:",
      errors,
    );

    throw new Error(
      "Nie udało się pobrać modułów.",
    );
  }

  return sortByOrder(data);
}

export async function getAdminModule(
  moduleId: string,
) {
  const { data, errors } =
    await amplifyClient.models.Module.get({
      id: moduleId,
    });

  if (errors?.length) {
    console.error(
      "Błąd pobierania modułu:",
      errors,
    );

    throw new Error(
      "Nie udało się pobrać modułu.",
    );
  }

  return data ?? null;
}

export async function createAdminModule(input: {
  courseId: string;
  title: string;
  slug: string;
  description: string;
  order: number;
  published: boolean;
}) {
  const { data, errors } =
    await amplifyClient.models.Module.create({
      ...input,
    });

  if (errors?.length) {
    console.error(
      "Błąd tworzenia modułu:",
      errors,
    );

    throw new Error(
      "Nie udało się utworzyć modułu.",
    );
  }

  if (!data) {
    throw new Error(
      "Amplify nie zwróciło utworzonego modułu.",
    );
  }

  return data;
}

export async function updateAdminModule(input: {
  id: string;
  title: string;
  slug: string;
  description: string;
  order: number;
  published: boolean;
}) {
  const { data, errors } =
    await amplifyClient.models.Module.update({
      ...input,
    });

  if (errors?.length) {
    console.error(
      "Błąd aktualizacji modułu:",
      errors,
    );

    throw new Error(
      "Nie udało się zaktualizować modułu.",
    );
  }

  return data;
}

/*
 * LESSONS
 */

export async function getAdminLessonsByModuleId(
  moduleId: string,
) {
  const { data, errors } =
    await amplifyClient.models.Lesson.list({
      filter: {
        moduleId: {
          eq: moduleId,
        },
      },
    });

  if (errors?.length) {
    console.error(
      "Błąd pobierania lekcji:",
      errors,
    );

    throw new Error(
      "Nie udało się pobrać lekcji.",
    );
  }

  return sortByOrder(data);
}

export async function getAdminLesson(
  lessonId: string,
) {
  const { data, errors } =
    await amplifyClient.models.Lesson.get({
      id: lessonId,
    });

  if (errors?.length) {
    console.error(
      "Błąd pobierania lekcji:",
      errors,
    );

    throw new Error(
      "Nie udało się pobrać lekcji.",
    );
  }

  return data ?? null;
}

export async function createAdminLesson(input: {
  moduleId: string;
  title: string;
  slug: string;
  description: string;
  durationMinutes: number;
  order: number;
  published: boolean;
}) {
  const { data, errors } =
    await amplifyClient.models.Lesson.create({
      ...input,
    });

  if (errors?.length) {
    console.error(
      "Błąd tworzenia lekcji:",
      errors,
    );

    throw new Error(
      "Nie udało się utworzyć lekcji.",
    );
  }

  if (!data) {
    throw new Error(
      "Amplify nie zwróciło utworzonej lekcji.",
    );
  }

  return data;
}

export async function updateAdminLesson(input: {
  id: string;
  title: string;
  slug: string;
  description: string;
  durationMinutes: number;
  order: number;
  published: boolean;
}) {
  const { data, errors } =
    await amplifyClient.models.Lesson.update({
      ...input,
    });

  if (errors?.length) {
    console.error(
      "Błąd aktualizacji lekcji:",
      errors,
    );

    throw new Error(
      "Nie udało się zaktualizować lekcji.",
    );
  }

  return data;
}

/*
 * NOTES
 */

export async function updateAdminLessonNote(input: {
  id: string;
  title: string;
  content: string;
  order: number;
}) {
  const { data, errors } =
    await amplifyClient.models.LessonNote.update({
      ...input,
    });

  if (errors?.length) {
    console.error(
      "Błąd aktualizacji notatki:",
      errors,
    );

    throw new Error(
      "Nie udało się zaktualizować notatki.",
    );
  }

  if (!data) {
    throw new Error(
      "Amplify nie zwróciło zaktualizowanej notatki.",
    );
  }

  return data;
}

export async function getAdminLessonNotes(
  lessonId: string,
) {
  const { data, errors } =
    await amplifyClient.models.LessonNote.list({
      filter: {
        lessonId: {
          eq: lessonId,
        },
      },
    });

  if (errors?.length) {
    console.error(
      "Błąd pobierania notatek:",
      errors,
    );

    throw new Error(
      "Nie udało się pobrać notatek.",
    );
  }

  return sortByOrder(data);
}

export async function createAdminLessonNote(input: {
  lessonId: string;
  title: string;
  content: string;
  order: number;
}) {
  const { data, errors } =
    await amplifyClient.models.LessonNote.create({
      ...input,
    });

  if (errors?.length) {
    console.error(
      "Błąd tworzenia notatki:",
      errors,
    );

    throw new Error(
      "Nie udało się utworzyć notatki.",
    );
  }

  return data;
}

export async function deleteAdminLessonNote(
  noteId: string,
) {
  const { errors } =
    await amplifyClient.models.LessonNote.delete({
      id: noteId,
    });

  if (errors?.length) {
    console.error(
      "Błąd usuwania notatki:",
      errors,
    );

    throw new Error(
      "Nie udało się usunąć notatki.",
    );
  }
}

/*
 * TASKS
 */
export async function updateAdminLessonTask(input: {
  id: string;
  title: string;
  content: string;
  answer: string;
  solution: string;
  order: number;
}) {
  const { data, errors } =
    await amplifyClient.models.LessonTask.update({
      ...input,
    });

  if (errors?.length) {
    console.error(
      "Błąd aktualizacji zadania:",
      errors,
    );

    throw new Error(
      "Nie udało się zaktualizować zadania.",
    );
  }

  if (!data) {
    throw new Error(
      "Amplify nie zwróciło zaktualizowanego zadania.",
    );
  }

  return data;
}

export async function getAdminLessonTasks(
  lessonId: string,
) {
  const { data, errors } =
    await amplifyClient.models.LessonTask.list({
      filter: {
        lessonId: {
          eq: lessonId,
        },
      },
    });

  if (errors?.length) {
    console.error(
      "Błąd pobierania zadań:",
      errors,
    );

    throw new Error(
      "Nie udało się pobrać zadań.",
    );
  }

  return sortByOrder(data);
}

export async function createAdminLessonTask(input: {
  lessonId: string;
  title: string;
  content: string;
  answer: string;
  solution: string;
  order: number;
}) {
  const { data, errors } =
    await amplifyClient.models.LessonTask.create({
      ...input,
    });

  if (errors?.length) {
    console.error(
      "Błąd tworzenia zadania:",
      errors,
    );

    throw new Error(
      "Nie udało się utworzyć zadania.",
    );
  }

  return data;
}

export async function deleteAdminLessonTask(
  taskId: string,
) {
  const { errors } =
    await amplifyClient.models.LessonTask.delete({
      id: taskId,
    });

  if (errors?.length) {
    console.error(
      "Błąd usuwania zadania:",
      errors,
    );

    throw new Error(
      "Nie udało się usunąć zadania.",
    );
  }
}