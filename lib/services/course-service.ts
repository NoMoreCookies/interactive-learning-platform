import { amplifyClient } from "@/lib/amplify-client";

export async function getPublishedCourses() {
  const { data, errors } =
    await amplifyClient.models.Course.list({
      filter: {
        published: {
          eq: true,
        },
      },
    });

  if (errors?.length) {
    console.error(
      "Błąd pobierania kursów:",
      JSON.stringify(errors, null, 2),
    );

    throw new Error(
      errors
        .map((error) => error.message)
        .join("\n"),
    );
  }

  return [...data].sort(
    (firstCourse, secondCourse) =>
      firstCourse.order - secondCourse.order,
  );
}

export async function getCourseBySlug(slug: string) {
  const { data, errors } =
    await amplifyClient.models.Course.list({
      filter: {
        slug: {
          eq: slug,
        },
      },
    });

  if (errors?.length) {
    console.error("Błąd pobierania kursu:", errors);
    throw new Error("Nie udało się pobrać kursu.");
  }

  return data[0] ?? null;
}

export async function getModulesByCourseId(
  courseId: string,
) {
  const { data, errors } =
    await amplifyClient.models.Module.list({
      filter: {
        courseId: {
          eq: courseId,
        },
        published: {
          eq: true,
        },
      },
    });

  if (errors?.length) {
    console.error("Błąd pobierania modułów:", errors);
    throw new Error("Nie udało się pobrać modułów.");
  }

  return [...data].sort(
    (firstModule, secondModule) =>
      firstModule.order - secondModule.order,
  );
}

export async function getLessonsByModuleId(
  moduleId: string,
) {
  const { data, errors } =
    await amplifyClient.models.Lesson.list({
      filter: {
        moduleId: {
          eq: moduleId,
        },
        published: {
          eq: true,
        },
      },
    });

  if (errors?.length) {
    console.error("Błąd pobierania lekcji:", errors);
    throw new Error("Nie udało się pobrać lekcji.");
  }

  return [...data].sort(
    (firstLesson, secondLesson) =>
      firstLesson.order - secondLesson.order,
  );
}

export async function getCourseStructure(slug: string) {
  const course = await getCourseBySlug(slug);

  if (!course) {
    return null;
  }

  const modules = await getModulesByCourseId(course.id);

  const modulesWithLessons = await Promise.all(
    modules.map(async (courseModule) => {
      const lessons = await getLessonsByModuleId(
        courseModule.id,
      );

      return {
        ...courseModule,
        lessons,
      };
    }),
  );

  return {
    ...course,
    modules: modulesWithLessons,
  };
}

export type LessonUploadOption = {
  lessonId: string;
  lessonTitle: string;
  lessonSlug: string;

  moduleTitle: string;

  courseTitle: string;
  courseSlug: string;
};

export async function getLessonUploadOptions(): Promise<
  LessonUploadOption[]
> {
  const courses = await getPublishedCourses();

  const lessons: LessonUploadOption[] = [];

  for (const course of courses) {
    const courseModules =
      await getModulesByCourseId(course.id);

    for (const courseModule of courseModules) {
      const moduleLessons =
        await getLessonsByModuleId(courseModule.id);

      for (const lesson of moduleLessons) {
        lessons.push({
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          lessonSlug: lesson.slug,

          moduleTitle: courseModule.title,

          courseTitle: course.title,
          courseSlug: course.slug,
        });
      }
    }
  }

  return lessons;
}