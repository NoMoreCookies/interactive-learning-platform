import {
  getUrl,
  remove,
  uploadData,
} from "aws-amplify/storage";

export type UploadProgress = {
  transferredBytes: number;
  totalBytes?: number;
  percentage: number;
};

type UploadFileOptions = {
  maxSizeBytes?: number;

  onProgress?: (
    progress: UploadProgress,
  ) => void;
};

const COURSE_STORAGE_PREFIX =
  "courses/";

function sanitizePathSegment(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

function validatePathSegment(
  value: string,
): boolean {
  return (
    Boolean(value) &&
    value !== "." &&
    value !== ".."
  );
}

function assertValidCourseStoragePath(
  path: string,
): string {
  const normalizedPath =
    path.trim();

  if (
    !normalizedPath ||
    !normalizedPath.startsWith(
      COURSE_STORAGE_PREFIX,
    ) ||
    normalizedPath.startsWith("/") ||
    normalizedPath.includes("\\") ||
    normalizedPath.includes("..")
  ) {
    throw new Error(
      "Nieprawidłowa ścieżka pliku.",
    );
  }

  const segments =
    normalizedPath.split("/");

  /*
   * Expected structure:
   *
   * courses/{courseSlug}/{lessonSlug}/{fileName}
   */
  if (
    segments.length !== 4 ||
    segments.some(
      (segment) =>
        !validatePathSegment(
          segment,
        ),
    )
  ) {
    throw new Error(
      "Nieprawidłowa struktura ścieżki pliku.",
    );
  }

  return normalizedPath;
}

export function buildLessonFilePath(
  courseSlug: string,
  lessonSlug: string,
  fileName: string,
): string {
  const safeCourseSlug =
    sanitizePathSegment(
      courseSlug,
    );

  const safeLessonSlug =
    sanitizePathSegment(
      lessonSlug,
    );

  const safeFileName =
    sanitizePathSegment(
      fileName,
    );

  if (
    !validatePathSegment(
      safeCourseSlug,
    ) ||
    !validatePathSegment(
      safeLessonSlug,
    ) ||
    !validatePathSegment(
      safeFileName,
    )
  ) {
    throw new Error(
      "Nie udało się zbudować poprawnej ścieżki pliku.",
    );
  }

  const path = [
    "courses",
    safeCourseSlug,
    safeLessonSlug,
    safeFileName,
  ].join("/");

  return assertValidCourseStoragePath(
    path,
  );
}

export function buildLessonVideoPath(
  courseSlug: string,
  lessonSlug: string,
  originalFileName: string,
): string {
  const fileExtension =
    originalFileName
      .split(".")
      .pop()
      ?.toLowerCase();

  if (fileExtension !== "mp4") {
    throw new Error(
      "Film musi być plikiem MP4.",
    );
  }

  return buildLessonFilePath(
    courseSlug,
    lessonSlug,
    "video.mp4",
  );
}

export function buildLessonMaterialsPath(
  courseSlug: string,
  lessonSlug: string,
): string {
  return buildLessonFilePath(
    courseSlug,
    lessonSlug,
    "materials.zip",
  );
}

export async function uploadFile(
  file: File,
  path: string,
  options?: UploadFileOptions,
): Promise<string> {
  if (!file) {
    throw new Error(
      "Nie przekazano pliku do wysłania.",
    );
  }

  if (file.size <= 0) {
    throw new Error(
      "Plik jest pusty.",
    );
  }

  if (
    options?.maxSizeBytes != null &&
    file.size >
      options.maxSizeBytes
  ) {
    throw new Error(
      "Plik przekracza dozwolony rozmiar.",
    );
  }

  const validatedPath =
    assertValidCourseStoragePath(
      path,
    );

  const result = await uploadData({
    path: validatedPath,
    data: file,

    options: {
      contentType:
        file.type ||
        "application/octet-stream",

      /*
       * A new upload must never silently replace an existing
       * object.
       */
      preventOverwrite: true,

      onProgress: ({
        transferredBytes,
        totalBytes,
      }) => {
        const percentage =
          totalBytes
            ? Math.round(
                (transferredBytes /
                  totalBytes) *
                  100,
              )
            : 0;

        options?.onProgress?.({
          transferredBytes,
          totalBytes,
          percentage,
        });
      },
    },
  }).result;

  return result.path;
}

export async function getFileUrl(
  path: string,
  expiresIn = 900,
): Promise<string> {
  const validatedPath =
    assertValidCourseStoragePath(
      path,
    );

  if (
    !Number.isInteger(
      expiresIn,
    ) ||
    expiresIn < 60 ||
    expiresIn > 3600
  ) {
    throw new Error(
      "Nieprawidłowy czas ważności URL.",
    );
  }

  const result = await getUrl({
    path: validatedPath,

    options: {
      validateObjectExistence: true,
      expiresIn,
    },
  });

  return result.url.toString();
}

export async function deleteFile(
  path: string,
): Promise<void> {
  const validatedPath =
    assertValidCourseStoragePath(
      path,
    );

  await remove({
    path: validatedPath,
  });
}