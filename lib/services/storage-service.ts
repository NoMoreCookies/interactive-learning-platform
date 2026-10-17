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

const COURSE_THUMBNAIL_PREFIX =
  "course-thumbnails/";

const RESOURCE_ID_PATTERN =
  /^[A-Za-z0-9_-]{1,128}$/;

const STORAGE_FILE_NAME_PATTERN =
  /^[A-Za-z0-9._-]{1,255}$/;

function validateLegacyPathSegment(
  value: string,
): boolean {
  return (
    Boolean(value) &&
    value !== "." &&
    value !== ".." &&
    STORAGE_FILE_NAME_PATTERN.test(
      value,
    )
  );
}

function normalizeResourceId(
  value: string,
  fieldName: string,
): string {
  const normalizedValue =
    value.trim();

  if (
    !RESOURCE_ID_PATTERN.test(
      normalizedValue,
    )
  ) {
    throw new Error(
      `Nieprawidłowy ${fieldName}.`,
    );
  }

  return normalizedValue;
}

function normalizeStorageFileName(
  fileName: string,
): string {
  const normalizedFileName =
    fileName.trim();

  if (
    !STORAGE_FILE_NAME_PATTERN.test(
      normalizedFileName,
    ) ||
    normalizedFileName === "." ||
    normalizedFileName === ".."
  ) {
    throw new Error(
      "Nieprawidłowa nazwa pliku.",
    );
  }

  return normalizedFileName;
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
    normalizedPath.startsWith(
      "/",
    ) ||
    normalizedPath.includes(
      "\\",
    ) ||
    normalizedPath.includes(
      "..",
    )
  ) {
    throw new Error(
      "Nieprawidłowa ścieżka pliku.",
    );
  }

  const segments =
    normalizedPath.split(
      "/",
    );

  /*
   * Current ID-based structure:
   *
   * courses/{courseId}/lessons/{lessonId}/{fileName}
   */
  const isCurrentPath =
    segments.length === 5 &&
    segments[0] === "courses" &&
    RESOURCE_ID_PATTERN.test(
      segments[1],
    ) &&
    segments[2] === "lessons" &&
    RESOURCE_ID_PATTERN.test(
      segments[3],
    ) &&
    STORAGE_FILE_NAME_PATTERN.test(
      segments[4],
    );

  if (isCurrentPath) {
    return normalizedPath;
  }

  /*
   * Legacy pre-Batch-6 structure kept only for reading/deleting
   * already uploaded test assets during the transition:
   *
   * courses/{courseSlug}/{lessonSlug}/{fileName}
   *
   * New uploads are never generated in this shape.
   */
  const isLegacyPath =
    segments.length === 4 &&
    segments[0] === "courses" &&
    segments
      .slice(1)
      .every(
        validateLegacyPathSegment,
      );

  if (!isLegacyPath) {
    throw new Error(
      "Nieprawidłowa struktura ścieżki pliku.",
    );
  }

  return normalizedPath;
}

function assertValidCourseThumbnailPath(
  path: string,
): string {
  const normalizedPath =
    path.trim();

  if (
    !normalizedPath ||
    !normalizedPath.startsWith(
      COURSE_THUMBNAIL_PREFIX,
    ) ||
    normalizedPath.startsWith(
      "/",
    ) ||
    normalizedPath.includes(
      "\\",
    ) ||
    normalizedPath.includes(
      "..",
    )
  ) {
    throw new Error(
      "Nieprawidłowa ścieżka miniaturki.",
    );
  }

  const segments =
    normalizedPath.split(
      "/",
    );

  if (
    segments.length !== 3 ||
    segments[0] !==
      "course-thumbnails" ||
    !RESOURCE_ID_PATTERN.test(
      segments[1],
    ) ||
    !/^thumbnail-\d{10,}\.png$/.test(
      segments[2],
    )
  ) {
    throw new Error(
      "Nieprawidłowa struktura ścieżki miniaturki.",
    );
  }

  return normalizedPath;
}

async function uploadValidatedFile(
  file: File,
  validatedPath: string,
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

  const result =
    await uploadData({
      path:
        validatedPath,

      data:
        file,

      options: {
        contentType:
          file.type ||
          "application/octet-stream",

        preventOverwrite:
          true,

        onProgress: ({
          transferredBytes,
          totalBytes,
        }) => {
          const percentage =
            totalBytes
              ? Math.round(
                  (
                    transferredBytes /
                    totalBytes
                  ) * 100,
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

export function buildLessonFilePath(
  courseId: string,
  lessonId: string,
  fileName: string,
): string {
  const safeCourseId =
    normalizeResourceId(
      courseId,
      "identyfikator kursu",
    );

  const safeLessonId =
    normalizeResourceId(
      lessonId,
      "identyfikator lekcji",
    );

  const safeFileName =
    normalizeStorageFileName(
      fileName,
    );

  const path = [
    "courses",
    safeCourseId,
    "lessons",
    safeLessonId,
    safeFileName,
  ].join("/");

  return assertValidCourseStoragePath(
    path,
  );
}

export function buildLessonVideoPath(
  courseId: string,
  lessonId: string,
  originalFileName: string,
): string {
  const fileExtension =
    originalFileName
      .split(".")
      .pop()
      ?.toLowerCase();

  if (
    fileExtension !== "mp4"
  ) {
    throw new Error(
      "Film musi być plikiem MP4.",
    );
  }

  return buildLessonFilePath(
    courseId,
    lessonId,
    "video.mp4",
  );
}

export function buildLessonMaterialsPath(
  courseId: string,
  lessonId: string,
): string {
  return buildLessonFilePath(
    courseId,
    lessonId,
    "materials.zip",
  );
}

export function buildCourseThumbnailPath(
  courseId: string,
): string {
  const safeCourseId =
    normalizeResourceId(
      courseId,
      "identyfikator kursu",
    );

  const path = [
    "course-thumbnails",
    safeCourseId,
    `thumbnail-${Date.now()}.png`,
  ].join("/");

  return assertValidCourseThumbnailPath(
    path,
  );
}

export async function uploadFile(
  file: File,
  path: string,
  options?: UploadFileOptions,
): Promise<string> {
  const validatedPath =
    assertValidCourseStoragePath(
      path,
    );

  return uploadValidatedFile(
    file,
    validatedPath,
    options,
  );
}

export async function uploadCourseThumbnail(
  file: File,
  path: string,
  options?: UploadFileOptions,
): Promise<string> {
  const validatedPath =
    assertValidCourseThumbnailPath(
      path,
    );

  return uploadValidatedFile(
    file,
    validatedPath,
    options,
  );
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

  const result =
    await getUrl({
      path:
        validatedPath,

      options: {
        validateObjectExistence:
          true,
        expiresIn,
      },
    });

  return result.url.toString();
}

export async function getCourseThumbnailUrl(
  path: string,
  expiresIn = 3600,
): Promise<string> {
  const validatedPath =
    assertValidCourseThumbnailPath(
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
      "Nieprawidłowy czas ważności URL miniaturki.",
    );
  }

  const result =
    await getUrl({
      path:
        validatedPath,

      options: {
        validateObjectExistence:
          true,
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
    path:
      validatedPath,
  });
}

export async function deleteCourseThumbnail(
  path: string,
): Promise<void> {
  const validatedPath =
    assertValidCourseThumbnailPath(
      path,
    );

  await remove({
    path:
      validatedPath,
  });
}
