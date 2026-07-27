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
  courseSlug: string;
  lessonSlug: string;

  assetType: "video" | "materials";

  currentPath?: string | null;

  onPathSaved: (
    path: string,
  ) => Promise<unknown>;

  onUploaded: (
    path: string,
  ) => void;
};

export default function LessonAssetUploader({
  courseSlug,
  lessonSlug,
  assetType,
  currentPath,
  onPathSaved,
  onUploaded,
}: LessonAssetUploaderProps) {
  const [file, setFile] =
    useState<File | null>(null);

  const [progress, setProgress] =
    useState(0);

  const [statusMessage, setStatusMessage] =
    useState("");

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [isUploading, setIsUploading] =
    useState(false);

  const isVideo = assetType === "video";

  useEffect(() => {
    async function loadPreview() {
      if (!currentPath) {
        setPreviewUrl("");
        return;
      }

      try {
        const url =
          await getFileUrl(currentPath);

        setPreviewUrl(url);
      } catch (error) {
        console.error(
          "Nie udało się pobrać URL pliku:",
          error,
        );
      }
    }

    void loadPreview();
  }, [currentPath]);

  function validateFile(
    selectedFile: File,
  ): boolean {
    if (isVideo) {
      return (
        selectedFile.type === "video/mp4" ||
        selectedFile.name
          .toLowerCase()
          .endsWith(".mp4")
      );
    }

    return (
      selectedFile.type ===
        "application/zip" ||
      selectedFile.type ===
        "application/x-zip-compressed" ||
      selectedFile.name
        .toLowerCase()
        .endsWith(".zip")
    );
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile =
      event.target.files?.[0] ?? null;

    setStatusMessage("");
    setProgress(0);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!validateFile(selectedFile)) {
      setFile(null);

      setStatusMessage(
        isVideo
          ? "Wybierz plik MP4."
          : "Wybierz plik ZIP.",
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

    setIsUploading(true);
    setProgress(0);

    let newPath = "";

    try {
      const extension = isVideo
        ? "mp4"
        : "zip";

      const fileName = isVideo
        ? `video-${Date.now()}.${extension}`
        : `materials-${Date.now()}.${extension}`;

      newPath = buildLessonFilePath(
        courseSlug,
        lessonSlug,
        fileName,
      );

      setStatusMessage(
        "Wysyłanie pliku do S3...",
      );

      const uploadedPath =
        await uploadFile(
          file,
          newPath,
          {
            onProgress(uploadProgress) {
              setProgress(
                uploadProgress.percentage,
              );
            },
          },
        );

      setStatusMessage(
        "Zapisywanie ścieżki w lekcji...",
      );

      await onPathSaved(uploadedPath);

      /*
       * Stary plik usuwamy dopiero po poprawnym
       * przesłaniu i zapisaniu nowego.
       */
      if (
        currentPath &&
        currentPath !== uploadedPath
      ) {
        try {
          await deleteFile(currentPath);
        } catch (error) {
          console.error(
            "Nie udało się usunąć starego pliku:",
            error,
          );
        }
      }

      const url =
        await getFileUrl(uploadedPath);

      setPreviewUrl(url);
      setFile(null);
      setProgress(100);

      setStatusMessage(
        "Plik został zapisany.",
      );

      onUploaded(uploadedPath);
    } catch (error) {
      /*
       * Gdy upload się powiedzie, ale zapis
       * w bazie nie, próbujemy posprzątać plik.
       */
      if (newPath) {
        try {
          await deleteFile(newPath);
        } catch {
          // Nie zastępujemy pierwotnego błędu.
        }
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

      {isVideo && previewUrl && (
        <video
          src={previewUrl}
          controls
          className="mt-6 aspect-video w-full rounded-xl bg-black"
        >
          Twoja przeglądarka nie obsługuje filmu.
        </video>
      )}

      {!isVideo && previewUrl && (
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
          onChange={handleFileChange}
          disabled={isUploading}
          className="block w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm"
        />

        {file && (
          <p className="text-sm text-zinc-400">
            Wybrano: {file.name}
          </p>
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

        <button
          type="submit"
          disabled={!file || isUploading}
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