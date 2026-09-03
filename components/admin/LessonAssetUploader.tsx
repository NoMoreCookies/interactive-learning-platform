"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  buildLessonFilePath,
  deleteFile,
  getFileUrl,
  uploadFile,
} from "@/lib/services/storage-service";

type LessonAssetUploaderProps = {
  lessonId: string;
  courseSlug: string;
  lessonSlug: string;
  assetType:
    | "video"
    | "materials";
  currentPath:
    | string
    | null
    | undefined;

  onPathSaved: (
    path: string,
  ) => Promise<unknown>;

  onUploaded: (
    path: string,
  ) => void;
};

/*
 * These limits are application guardrails for the ADMIN authoring
 * interface.
 *
 * They are not a replacement for backend authorization.
 */
const MAX_VIDEO_SIZE_BYTES =
  2 * 1024 * 1024 * 1024;

const MAX_MATERIALS_SIZE_BYTES =
  250 * 1024 * 1024;

function formatFileSize(
  bytes: number,
): string {
  const megabytes =
    bytes / (1024 * 1024);

  if (megabytes >= 1024) {
    return `${(
      megabytes / 1024
    ).toFixed(1)} GB`;
  }

  return `${Math.round(
    megabytes,
  )} MB`;
}

export default function LessonAssetUploader({
  lessonId,
  courseSlug,
  lessonSlug,
  assetType,
  currentPath,
  onPathSaved,
  onUploaded,
}: LessonAssetUploaderProps) {
  const [
    file,
    setFile,
  ] = useState<File | null>(
    null,
  );

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState("");

  const [
    isUploading,
    setIsUploading,
  ] = useState(false);

  const isVideo =
    assetType === "video";

  const maxFileSize =
    isVideo
      ? MAX_VIDEO_SIZE_BYTES
      : MAX_MATERIALS_SIZE_BYTES;

  useEffect(() => {
    let isCancelled = false;

    async function loadPreview() {
      if (!currentPath) {
        setPreviewUrl("");
        return;
      }

      try {
        const url =
          await getFileUrl(
            currentPath,
          );

        if (!isCancelled) {
          setPreviewUrl(url);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.error(
          "Nie udało się pobrać URL pliku:",
          error,
        );

        setPreviewUrl("");
      }
    }

    void loadPreview();

    return () => {
      isCancelled = true;
    };
  }, [
    currentPath,
  ]);

  function validateFile(
    selectedFile: File,
  ): string | null {
    if (
      selectedFile.size <= 0
    ) {
      return "Wybrany plik jest pusty.";
    }

    if (
      selectedFile.size >
      maxFileSize
    ) {
      return `Plik jest za duży. Maksymalny rozmiar to ${formatFileSize(
        maxFileSize,
      )}.`;
    }

    const fileName =
      selectedFile.name.toLowerCase();

    if (isVideo) {
      if (
        !fileName.endsWith(
          ".mp4",
        )
      ) {
        return "Film musi mieć rozszerzenie .mp4.";
      }

      /*
       * Some browsers may leave File.type empty.
       * If MIME is present, require the expected value.
       */
      if (
        selectedFile.type &&
        selectedFile.type !==
          "video/mp4"
      ) {
        return "Wybrany plik nie ma poprawnego typu MIME dla MP4.";
      }

      return null;
    }

    if (
      !fileName.endsWith(
        ".zip",
      )
    ) {
      return "Materiały muszą mieć rozszerzenie .zip.";
    }

    const allowedZipTypes =
      new Set([
        "application/zip",
        "application/x-zip-compressed",
      ]);

    if (
      selectedFile.type &&
      !allowedZipTypes.has(
        selectedFile.type,
      )
    ) {
      return "Wybrany plik nie ma poprawnego typu MIME dla ZIP.";
    }

    return null;
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile =
      event.target.files?.[0] ??
      null;

    setStatusMessage("");
    setProgress(0);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const validationError =
      validateFile(
        selectedFile,
      );

    if (validationError) {
      setFile(null);
      setStatusMessage(
        validationError,
      );

      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  }

  async function handleUpload(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!file) {
      setStatusMessage(
        "Najpierw wybierz plik.",
      );

      return;
    }

    if (!lessonId.trim()) {
      setStatusMessage(
        "Brak identyfikatora lekcji.",
      );

      return;
    }

    /*
     * Validate again immediately before upload.
     *
     * Validation on file selection is primarily UX. Repeating it
     * here avoids depending on stale component state.
     */
    const validationError =
      validateFile(file);

    if (validationError) {
      setStatusMessage(
        validationError,
      );

      return;
    }

    setIsUploading(true);
    setProgress(0);
    setStatusMessage("");

    let uploadedPath:
      | string
      | null = null;

    try {
      const extension =
        isVideo
          ? "mp4"
          : "zip";

      const fileName =
        isVideo
          ? `video-${Date.now()}.${extension}`
          : `materials-${Date.now()}.${extension}`;

      const newPath =
        buildLessonFilePath(
          courseSlug,
          lessonSlug,
          fileName,
        );

      setStatusMessage(
        "Wysyłanie pliku do S3...",
      );

      uploadedPath =
        await uploadFile(
          file,
          newPath,
          {
            maxSizeBytes:
              maxFileSize,

            onProgress(
              uploadProgress,
            ) {
              setProgress(
                uploadProgress.percentage,
              );
            },
          },
        );

      setStatusMessage(
        "Zapisywanie ścieżki w lekcji...",
      );

      /*
       * Once this operation is attempted, automatic deletion of
       * the new object is intentionally avoided.
       *
       * A network failure can make the result ambiguous:
       * DynamoDB may have committed the new path even if the client
       * received an error.
       */
      await onPathSaved(
        uploadedPath,
      );

      const warnings: string[] =
        [];

      /*
       * Delete the previous object only after the new path has been
       * successfully persisted.
       */
      if (
        currentPath &&
        currentPath !==
          uploadedPath
      ) {
        try {
          await deleteFile(
            currentPath,
          );
        } catch (error) {
          console.error(
            "Nie udało się usunąć starego pliku:",
            error,
          );

          warnings.push(
            "Nie udało się automatycznie usunąć starego pliku.",
          );
        }
      }

      /*
       * Preview generation is not part of the persistence
       * transaction. Failure here must never remove the newly saved
       * object.
       */
      try {
        const url =
          await getFileUrl(
            uploadedPath,
          );

        setPreviewUrl(url);
      } catch (error) {
        console.error(
          "Plik zapisano, ale nie udało się przygotować podglądu:",
          error,
        );

        setPreviewUrl("");

        warnings.push(
          "Nie udało się przygotować podglądu.",
        );
      }

      setFile(null);
      setProgress(100);

      if (
        warnings.length > 0
      ) {
        setStatusMessage(
          `Plik został zapisany. ${warnings.join(
            " ",
          )}`,
        );
      } else {
        setStatusMessage(
          "Plik został zapisany.",
        );
      }

      try {
        onUploaded(
          uploadedPath,
        );
      } catch (error) {
        /*
         * A local callback failure must not change the persisted
         * state of the asset.
         */
        console.error(
          "Plik zapisano, ale callback onUploaded zakończył się błędem:",
          error,
        );
      }
    } catch (error) {
      /*
       * Do not automatically delete uploadedPath here.
       *
       * Once the upload succeeded, a failure while saving the
       * DynamoDB path can be ambiguous from the browser's point of
       * view. Deleting the S3 object could create a database
       * reference to a missing file.
       *
       * An orphaned object is safer and can be cleaned up later by
       * an explicit maintenance process.
       */
      if (uploadedPath) {
        console.error(
          "Upload zakończył się częściowym sukcesem. Plik pozostawiono w S3, aby uniknąć uszkodzenia referencji.",
        );
      }

      const message =
        error instanceof Error
          ? error.message
          : "Nieznany błąd.";

      setStatusMessage(
        `Nie udało się zapisać pliku: ${message}`,
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {isVideo
              ? "Film"
              : "Materiały"}
          </h2>

          <p className="mt-1 text-sm text-zinc-400">
            {currentPath
              ? "Plik jest przypisany do lekcji."
              : "Nie przesłano jeszcze pliku."}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Maksymalny rozmiar:{" "}
            {formatFileSize(
              maxFileSize,
            )}
          </p>
        </div>

        <span
          className={
            currentPath
              ? "rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-300"
              : "rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-300"
          }
        >
          {currentPath
            ? "Gotowe"
            : "Brak"}
        </span>
      </div>

      {isVideo &&
        previewUrl && (
          <video
            src={previewUrl}
            controls
            preload="metadata"
            className="mt-6 aspect-video w-full rounded-xl bg-black"
          >
            Twoja przeglądarka nie obsługuje filmu.
          </video>
        )}

      {!isVideo &&
        previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 block rounded-xl border border-zinc-700 bg-black px-4 py-3 text-center text-sm transition hover:border-white"
          >
            Pobierz obecne materiały
          </a>
        )}

      <form
        onSubmit={handleUpload}
        className="mt-6 space-y-4"
      >
        <input
          type="file"
          accept={
            isVideo
              ? "video/mp4,.mp4"
              : ".zip,application/zip,application/x-zip-compressed"
          }
          onChange={
            handleFileChange
          }
          disabled={isUploading}
          className="block w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm"
        />

        {file && (
          <p className="text-sm text-zinc-400">
            Wybrano:{" "}
            {file.name} (
            {formatFileSize(
              file.size,
            )}
            )
          </p>
        )}

        {isUploading && (
          <div>
            <div className="mb-2 flex justify-between text-sm text-zinc-400">
              <span>
                Postęp
              </span>

              <span>
                {progress}%
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-white"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={
            !file ||
            isUploading
          }
          className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
        >
          {isUploading
            ? `Wysyłanie... ${progress}%`
            : currentPath
              ? "Podmień plik"
              : "Prześlij plik"}
        </button>

        {statusMessage && (
          <p className="text-sm text-zinc-300">
            {statusMessage}
          </p>
        )}
      </form>
    </section>
  );
}