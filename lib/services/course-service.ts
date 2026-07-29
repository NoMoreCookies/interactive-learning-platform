import { fetchAuthSession } from "aws-amplify/auth";

import { amplifyClient } from "@/lib/amplify-client";
import { sortByOrder } from "@/lib/utils/sort-by-order";

type CourseReadAuthMode =
  | "userPool"
  | "identityPool";

type AmplifyDataError = {
  message?: string | null;
  errorType?: string | null;
};

/**
 * Selects the authorization mode appropriate for the current session.
 *
 * Signed-in users use Cognito User Pool authorization. Signed-out visitors
 * use the unauthenticated role provided by Cognito Identity Pool.
 */
async function getCourseReadAuthMode(): Promise<CourseReadAuthMode> {
  try {
    const session = await fetchAuthSession();

    if (session.tokens?.accessToken) {
      return "userPool";
    }
  } catch (error) {
    /*
     * A missing authenticated session is expected for visitors.
     * The request will fall back to the guest Identity Pool role.
     */
    console.debug(
      "No authenticated session was found. Using guest course access.",
      error,
    );
  }

  return "identityPool";
}

/**
 * Logs the original Amplify errors and throws a safe application error.
 */
function throwDataError(
  operation: string,
  errors:
    | readonly AmplifyDataError[]
    | undefined,
): never {
  console.error(
    `Amplify data error during ${operation}:`,
    errors,
  );

  const errorDetails = errors
    ?.map((error) => error.message)
    .filter(
      (message): message is string =>
        typeof message === "string" &&
        message.length > 0,
    )
    .join(" | ");

  throw new Error(
    errorDetails
      ? `${operation}: ${errorDetails}`
      : `Nie udało się wykonać operacji: ${operation}.`,
  );
}

export async function getPublishedCourses() {
  const authMode =
    await getCourseReadAuthMode();

  const { data, errors } =
    await amplifyClient.models.Course.list({
      authMode,
      filter: {
        published: {
          eq: true,
        },
      },
    });

  if (errors?.length) {
    throwDataError(
      "Pobieranie kursów",
      errors,
    );
  }

  return sortByOrder(data);
}

export async function getCourseBySlug(
  slug: string,
) {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const authMode =
    await getCourseReadAuthMode();

  const { data, errors } =
    await amplifyClient.models.Course.list({
      authMode,
      filter: {
        slug: {
          eq: normalizedSlug,
        },
        published: {
          eq: true,
        },
      },
    });

  if (errors?.length) {
    throwDataError(
      "Pobieranie kursu",
      errors,
    );
  }

  return data[0] ?? null;
}

export async function getModulesByCourseId(
  courseId: string,
) {
  const normalizedCourseId =
    courseId.trim();

  if (!normalizedCourseId) {
    return [];
  }

  const authMode =
    await getCourseReadAuthMode();

  const { data, errors } =
    await amplifyClient.models.Module.list({
      authMode,
      filter: {
        courseId: {
          eq: normalizedCourseId,
        },
        published: {
          eq: true,
        },
      },
    });

  if (errors?.length) {
    throwDataError(
      "Pobieranie modułów",
      errors,
    );
  }

  return sortByOrder(data);
}

export async function getLessonsByModuleId(
  moduleId: string,
) {
  const normalizedModuleId =
    moduleId.trim();

  if (!normalizedModuleId) {
    return [];
  }

  const authMode =
    await getCourseReadAuthMode();

  const { data, errors } =
    await amplifyClient.models.Lesson.list({
      authMode,
      filter: {
        moduleId: {
          eq: normalizedModuleId,
        },
        published: {
          eq: true,
        },
      },
    });

  if (errors?.length) {
    throwDataError(
      "Pobieranie lekcji",
      errors,
    );
  }

  return sortByOrder(data);
}

export async function getCourseStructure(
  slug: string,
) {
  const course =
    await getCourseBySlug(slug);

  if (!course) {
    return null;
  }

  const modules =
    await getModulesByCourseId(
      course.id,
    );

  const modulesWithLessons =
    await Promise.all(
      modules.map(
        async (courseModule) => ({
          ...courseModule,
          lessons:
            await getLessonsByModuleId(
              courseModule.id,
            ),
        }),
      ),
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
  const courses =
    await getPublishedCourses();

  const courseOptions =
    await Promise.all(
      courses.map(async (course) => {
        const modules =
          await getModulesByCourseId(
            course.id,
          );

        const moduleOptions =
          await Promise.all(
            modules.map(
              async (courseModule) => {
                const lessons =
                  await getLessonsByModuleId(
                    courseModule.id,
                  );

                return lessons.map(
                  (lesson) => ({
                    lessonId:
                      lesson.id,
                    lessonTitle:
                      lesson.title,
                    lessonSlug:
                      lesson.slug,
                    moduleTitle:
                      courseModule.title,
                    courseTitle:
                      course.title,
                    courseSlug:
                      course.slug,
                  }),
                );
              },
            ),
          );

        return moduleOptions.flat();
      }),
    );

  return courseOptions.flat();
}