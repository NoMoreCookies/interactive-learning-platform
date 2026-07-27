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
  onProgress?: (progress: UploadProgress) => void;
};

function sanitizePathSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

export function buildLessonFilePath(
  courseSlug: string,
  lessonSlug: string,
  fileName: string,
): string {
  const safeCourseSlug =
    sanitizePathSegment(courseSlug);

  const safeLessonSlug =
    sanitizePathSegment(lessonSlug);

  const safeFileName =
    sanitizePathSegment(fileName);

  if (
    !safeCourseSlug ||
    !safeLessonSlug ||
    !safeFileName
  ) {
    throw new Error(
      "Nie udało się zbudować poprawnej ścieżki pliku.",
    );
  }

  return [
    "courses",
    safeCourseSlug,
    safeLessonSlug,
    safeFileName,
  ].join("/");
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
      ?.toLowerCase() || "mp4";

  return buildLessonFilePath(
    courseSlug,
    lessonSlug,
    `video.${fileExtension}`,
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

  if (!path.trim()) {
    throw new Error(
      "Ścieżka pliku nie może być pusta.",
    );
  }

  const result = await uploadData({
    path,
    data: file,
    options: {
      contentType:
        file.type || "application/octet-stream",

      preventOverwrite: true,

      onProgress: ({
        transferredBytes,
        totalBytes,
      }) => {
        const percentage = totalBytes
          ? Math.round(
              (transferredBytes / totalBytes) *
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
  if (!path.trim()) {
    throw new Error(
      "Ścieżka pliku nie może być pusta.",
    );
  }

  const result = await getUrl({
    path,
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
  if (!path.trim()) {
    throw new Error(
      "Ścieżka pliku nie może być pusta.",
    );
  }

  await remove({
    path,
  });
}