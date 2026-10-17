"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  buildCourseThumbnailPath,
  deleteCourseThumbnail,
  getCourseThumbnailUrl,
  uploadCourseThumbnail,
} from "@/lib/services/storage-service";

type CourseThumbnailUploaderProps = {
  courseId: string;
  currentPath: string | null | undefined;

  onPathSaved: (
    path: string | null,
  ) => Promise<unknown>;

  onChanged?: (
    path: string | null,
  ) => void;
};

const MAX_THUMBNAIL_SIZE_BYTES =
  5 * 1024 * 1024;

const MIN_THUMBNAIL_WIDTH =
  1280;

const MIN_THUMBNAIL_HEIGHT =
  720;

const TARGET_ASPECT_RATIO =
  16 / 9;

const ASPECT_RATIO_TOLERANCE =
  0.01;

const PNG_SIGNATURE = [
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
] as const;

type ImageDimensions = {
  width: number;
  height: number;
};

function formatFileSize(
  bytes: number,
): string {
  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

async function hasValidPngSignature(
  file: File,
): Promise<boolean> {
  const buffer =
    await file
      .slice(
        0,
        PNG_SIGNATURE.length,
      )
      .arrayBuffer();

  const bytes =
    new Uint8Array(buffer);

  return (
    bytes.length ===
      PNG_SIGNATURE.length &&
    PNG_SIGNATURE.every(
      (expectedByte, index) =>
        bytes[index] ===
        expectedByte,
    )
  );
}

function getImageDimensions(
  file: File,
): Promise<ImageDimensions> {
  return new Promise(
    (resolve, reject) => {
      const objectUrl =
        URL.createObjectURL(file);

      const image =
        new Image();

      image.onload = () => {
        const dimensions = {
          width: image.naturalWidth,
          height: image.naturalHeight,
        };

        URL.revokeObjectURL(
          objectUrl,
        );

        resolve(dimensions);
      };

      image.onerror = () => {
        URL.revokeObjectURL(
          objectUrl,
        );

        reject(
          new Error(
            "Nie udało się odczytać obrazu PNG.",
          ),
        );
      };

      image.src = objectUrl;
    },
  );
}

async function validateThumbnail(
  file: File,
): Promise<
  | {
      error: string;
      dimensions?: never;
    }
  | {
      error: null;
      dimensions: ImageDimensions;
    }
> {
  if (file.size <= 0) {
    return {
      error:
        "Wybrany plik jest pusty.",
    };
  }

  if (
    file.size >
    MAX_THUMBNAIL_SIZE_BYTES
  ) {
    return {
      error:
        `Miniaturka może mieć maksymalnie ${formatFileSize(
          MAX_THUMBNAIL_SIZE_BYTES,
        )}.`,
    };
  }

  if (
    !file.name
      .toLowerCase()
      .endsWith(".png")
  ) {
    return {
      error:
        "Miniaturka musi być plikiem PNG.",
    };
  }

  if (
    file.type &&
    file.type !== "image/png"
  ) {
    return {
      error:
        "Plik nie ma poprawnego typu MIME image/png.",
    };
  }

  if (
    !(await hasValidPngSignature(
      file,
    ))
  ) {
    return {
      error:
        "Plik nie ma poprawnej sygnatury PNG.",
    };
  }

  const dimensions =
    await getImageDimensions(
      file,
    );

  if (
    dimensions.width <
      MIN_THUMBNAIL_WIDTH ||
    dimensions.height <
      MIN_THUMBNAIL_HEIGHT
  ) {
    return {
      error:
        `Miniaturka jest za mała (${dimensions.width} × ${dimensions.height} px). Minimalna rozdzielczość to 1280 × 720 px.`,
    };
  }

  const aspectRatio =
    dimensions.width /
    dimensions.height;

  if (
    Math.abs(
      aspectRatio -
        TARGET_ASPECT_RATIO,
    ) > ASPECT_RATIO_TOLERANCE
  ) {
    return {
      error:
        `Miniaturka ma proporcje ${dimensions.width} × ${dimensions.height}. Wymagane są proporcje 16:9, np. 1280 × 720 px lub 1920 × 1080 px.`,
    };
  }

  return {
    error: null,
    dimensions,
  };
}

export default function CourseThumbnailUploader({
  courseId,
  currentPath,
  onPathSaved,
  onChanged,
}: CourseThumbnailUploaderProps) {
  const [file, setFile] =
    useState<File | null>(null);

  const [
    selectedDimensions,
    setSelectedDimensions,
  ] = useState<
    ImageDimensions | null
  >(null);

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState("");

  const [progress, setProgress] =
    useState(0);

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const [
    isUploading,
    setIsUploading,
  ] = useState(false);

  const [
    isRemoving,
    setIsRemoving,
  ] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadPreview() {
      if (!currentPath) {
        setPreviewUrl("");
        return;
      }

      try {
        const url =
          await getCourseThumbnailUrl(
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
          "Nie udało się pobrać miniaturki kursu.",
          error,
        );

        setPreviewUrl("");
      }
    }

    void loadPreview();

    return () => {
      isCancelled = true;
    };
  }, [currentPath]);

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile =
      event.target.files?.[0] ??
      null;

    setStatusMessage("");
    setProgress(0);
    setSelectedDimensions(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    try {
      const validation =
        await validateThumbnail(
          selectedFile,
        );

      if (validation.error) {
        setFile(null);
        setStatusMessage(
          validation.error,
        );
        event.target.value = "";
        return;
      }

      setFile(selectedFile);
      setSelectedDimensions(
        validation.dimensions,
      );
    } catch (error) {
      console.error(
        "Nie udało się zweryfikować miniaturki.",
        error,
      );

      setFile(null);
      setStatusMessage(
        "Nie udało się zweryfikować wybranego obrazu.",
      );
      event.target.value = "";
    }
  }

  async function handleUpload(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !file ||
      isUploading ||
      isRemoving
    ) {
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setStatusMessage("");

    let uploadedPath:
      | string
      | null = null;

    try {
      const validation =
        await validateThumbnail(
          file,
        );

      if (validation.error) {
        throw new Error(
          validation.error,
        );
      }

      const newPath =
        buildCourseThumbnailPath(
          courseId,
        );

      setStatusMessage(
        "Wysyłanie miniaturki do S3...",
      );

      uploadedPath =
        await uploadCourseThumbnail(
          file,
          newPath,
          {
            maxSizeBytes:
              MAX_THUMBNAIL_SIZE_BYTES,

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
        "Zapisywanie miniaturki w kursie...",
      );

      /*
       * Persist the new reference first. If old-file cleanup fails,
       * we prefer an orphaned image over a broken Course reference.
       */
      await onPathSaved(
        uploadedPath,
      );

      const warnings: string[] = [];

      if (
        currentPath &&
        currentPath !== uploadedPath
      ) {
        try {
          await deleteCourseThumbnail(
            currentPath,
          );
        } catch (error) {
          console.error(
            "Nie udało się usunąć starej miniaturki.",
            error,
          );

          warnings.push(
            "Stara miniaturka pozostała w S3 i zostanie posprzątana przez cleanup.",
          );
        }
      }

      try {
        const url =
          await getCourseThumbnailUrl(
            uploadedPath,
          );

        setPreviewUrl(url);
      } catch (error) {
        console.error(
          "Miniaturka została zapisana, ale nie udało się przygotować podglądu.",
          error,
        );

        setPreviewUrl("");
        warnings.push(
          "Nie udało się przygotować podglądu.",
        );
      }

      setFile(null);
      setSelectedDimensions(null);
      setProgress(100);

      setStatusMessage(
        warnings.length > 0
          ? `Miniaturka została zapisana. ${warnings.join(" ")}`
          : "Miniaturka została zapisana.",
      );

      onChanged?.(
        uploadedPath,
      );
    } catch (error) {
      /*
       * Do not auto-delete uploadedPath once the database update
       * has been attempted. A network failure can be ambiguous.
       */
      if (uploadedPath) {
        console.error(
          "Upload miniaturki zakończył się częściowym sukcesem. Obiekt pozostawiono w S3.",
        );
      }

      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Nie udało się zapisać miniaturki.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemove() {
    if (
      !currentPath ||
      isUploading ||
      isRemoving
    ) {
      return;
    }

    setIsRemoving(true);
    setStatusMessage("");

    try {
      /*
       * Remove the DB reference first. A later S3 failure leaves
       * only an orphaned image, not a broken application reference.
       */
      await onPathSaved(null);

      const warnings: string[] = [];

      try {
        await deleteCourseThumbnail(
          currentPath,
        );
      } catch (error) {
        console.error(
          "Nie udało się usunąć miniaturki z S3.",
          error,
        );

        warnings.push(
          "Plik pozostał w S3 i zostanie posprzątany przez cleanup.",
        );
      }

      setPreviewUrl("");
      setFile(null);
      setSelectedDimensions(null);
      setProgress(0);

      setStatusMessage(
        warnings.length > 0
          ? `Miniaturka została odpięta od kursu. ${warnings.join(" ")}`
          : "Miniaturka została usunięta.",
      );

      onChanged?.(null);
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Nie udało się usunąć miniaturki.",
      );
    } finally {
      setIsRemoving(false);
    }
  }

  const isBusy =
    isUploading ||
    isRemoving;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">
            Miniaturka kursu
          </h2>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Zalecana rozdzielczość:{" "}
            <strong className="font-medium text-zinc-200">
              1280 × 720 px
            </strong>{" "}
            (16:9).
          </p>

          <p className="text-sm leading-6 text-zinc-500">
            Możesz użyć większego obrazu 16:9,
            np. 1920 × 1080 px. Format: PNG.
            Maksymalny rozmiar: 5 MB.
          </p>
        </div>

        <span
          className={
            currentPath
              ? "rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
              : "rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-300"
          }
        >
          {currentPath
            ? "Dodana"
            : "Brak"}
        </span>
      </div>

      <div className="mt-6 aspect-video overflow-hidden rounded-xl border border-zinc-800 bg-black">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Podgląd miniaturki kursu"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-600">
            Brak miniaturki
          </div>
        )}
      </div>

      <form
        onSubmit={handleUpload}
        className="mt-6 space-y-4"
      >
        <input
          type="file"
          accept="image/png,.png"
          disabled={isBusy}
          onChange={(event) => {
            void handleFileChange(
              event,
            );
          }}
          className="block w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-zinc-200"
        />

        {file && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400">
            <p>
              Wybrano:{" "}
              <span className="text-zinc-200">
                {file.name}
              </span>
            </p>

            {selectedDimensions && (
              <p className="mt-1">
                Rozdzielczość:{" "}
                {selectedDimensions.width} ×{" "}
                {selectedDimensions.height} px
              </p>
            )}
          </div>
        )}

        {isUploading && (
          <div>
            <div className="mb-2 flex justify-between text-sm text-zinc-400">
              <span>Postęp</span>
              <span>{progress}%</span>
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

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={
              !file ||
              isBusy
            }
            className="flex-1 rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading
              ? `Wysyłanie... ${progress}%`
              : currentPath
                ? "Podmień miniaturkę"
                : "Dodaj miniaturkę"}
          </button>

          {currentPath && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                void handleRemove();
              }}
              className="rounded-xl border border-red-900/60 px-5 py-3 font-medium text-red-300 transition hover:border-red-700 hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRemoving
                ? "Usuwanie..."
                : "Usuń miniaturkę"}
            </button>
          )}
        </div>

        {statusMessage && (
          <p className="text-sm text-zinc-300">
            {statusMessage}
          </p>
        )}
      </form>
    </section>
  );
}
