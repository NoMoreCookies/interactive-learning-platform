"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  getLessonUploadOptions,
  type LessonUploadOption,
} from "@/lib/services/course-service";

import {
  uploadFile,
} from "@/lib/services/storage-service";

import FilePicker from "@/components/ui/FilePicker";
import LessonSelector from "@/components/admin/LessonSelector";
import UploadProgress from "@/components/ui/UploadProgress";

type BuildPathFunction = (
  lesson: LessonUploadOption,
  file: File,
) => string;

type UpdateLessonPathFunction = (
  lessonId: string,
  uploadedPath: string,
) => Promise<unknown>;

type LessonFileUploaderProps = {
  heading: string;
  description: string;

  fileInputId: string;
  fileLabel: string;
  accept: string;

  uploadButtonLabel: string;
  uploadingButtonLabel: string;

  invalidFileMessage: string;
  uploadingStatusMessage: string;
  savingStatusMessage: string;
  successMessage: string;
  errorPrefix: string;

  validateFile: (file: File) => boolean;
  buildPath: BuildPathFunction;
  updateLessonPath: UpdateLessonPathFunction;
};

export default function LessonFileUploader({
  heading,
  description,
  fileInputId,
  fileLabel,
  accept,
  uploadButtonLabel,
  uploadingButtonLabel,
  invalidFileMessage,
  uploadingStatusMessage,
  savingStatusMessage,
  successMessage,
  errorPrefix,
  validateFile,
  buildPath,
  updateLessonPath,
}: LessonFileUploaderProps) {
  const [lessonOptions, setLessonOptions] =
    useState<LessonUploadOption[]>([]);

  const [selectedLessonId, setSelectedLessonId] =
    useState("");

  const [file, setFile] =
    useState<File | null>(null);

  const [progress, setProgress] =
    useState(0);

  const [statusMessage, setStatusMessage] =
    useState("");

  const [uploadedPath, setUploadedPath] =
    useState("");

  const [isLoadingLessons, setIsLoadingLessons] =
    useState(true);

  const [isUploading, setIsUploading] =
    useState(false);

  const [fileInputKey, setFileInputKey] =
    useState(0);

  const selectedLesson =
    lessonOptions.find(
      (lesson) =>
        lesson.lessonId === selectedLessonId,
    ) ?? null;

  useEffect(() => {
    async function loadLessons() {
      setIsLoadingLessons(true);
      setStatusMessage("");

      try {
        const options =
          await getLessonUploadOptions();

        setLessonOptions(options);

        if (options.length > 0) {
          setSelectedLessonId(
            options[0].lessonId,
          );
        }
      } catch (error) {
        console.error(
          "Błąd pobierania listy lekcji:",
          error,
        );

        setStatusMessage(
          "Nie udało się pobrać listy lekcji.",
        );
      } finally {
        setIsLoadingLessons(false);
      }
    }

    void loadLessons();
  }, []);

  function handleLessonChange(
    lessonId: string,
  ) {
    setSelectedLessonId(lessonId);
    setStatusMessage("");
    setUploadedPath("");
    setProgress(0);
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile =
      event.target.files?.[0] ?? null;

    setStatusMessage("");
    setUploadedPath("");
    setProgress(0);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!validateFile(selectedFile)) {
      setFile(null);
      setStatusMessage(invalidFileMessage);

      event.target.value = "";

      return;
    }

    setFile(selectedFile);
  }

  async function handleUpload(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedLesson) {
      setStatusMessage(
        "Wybierz lekcję.",
      );

      return;
    }

    if (!file) {
      setStatusMessage(
        invalidFileMessage,
      );

      return;
    }

    setIsUploading(true);
    setProgress(0);
    setUploadedPath("");

    setStatusMessage(
      "Przygotowywanie uploadu...",
    );

    try {
      const path =
        buildPath(
          selectedLesson,
          file,
        );

      console.log(
        "Docelowa ścieżka pliku:",
        path,
      );

      setStatusMessage(
        uploadingStatusMessage,
      );

      const resultPath =
        await uploadFile(
          file,
          path,
          {
            onProgress(uploadProgress) {
              setProgress(
                uploadProgress.percentage,
              );
            },
          },
        );

      console.log(
        "Plik zapisany w S3:",
        resultPath,
      );

      setStatusMessage(
        savingStatusMessage,
      );

      await updateLessonPath(
        selectedLesson.lessonId,
        resultPath,
      );

      setUploadedPath(resultPath);
      setProgress(100);
      setStatusMessage(successMessage);

      setFile(null);

      setFileInputKey(
        (currentKey) => currentKey + 1,
      );
    } catch (error) {
      console.error(
        "Błąd uploadu pliku:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Wystąpił nieznany błąd.";

      setStatusMessage(
        `${errorPrefix}: ${message}`,
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <header>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          Narzędzie techniczne
        </p>

        <h1 className="mt-3 text-4xl font-bold">
          {heading}
        </h1>

        <p className="mt-4 text-zinc-400">
          {description}
        </p>
      </header>

      <form
        onSubmit={handleUpload}
        className="mt-10 space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
      >
        <LessonSelector
          lessons={lessonOptions}
          selectedLessonId={selectedLessonId}
          isLoading={isLoadingLessons}
          disabled={isUploading}
          onChange={handleLessonChange}
        />

        <FilePicker
          key={fileInputKey}
          id={fileInputId}
          label={fileLabel}
          accept={accept}
          file={file}
          disabled={isUploading}
          inputKey={fileInputKey}
          onFileChange={handleFileChange}
        />

        <UploadProgress
          progress={progress}
          isUploading={isUploading}
          statusMessage={statusMessage}
          uploadedPath={uploadedPath}
        />

        <button
          type="submit"
          disabled={
            isLoadingLessons ||
            isUploading ||
            !selectedLesson ||
            !file
          }
          className="w-full rounded-xl bg-white px-6 py-4 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading
            ? `${uploadingButtonLabel} ${progress}%`
            : uploadButtonLabel}
        </button>
      </form>
    </main>
  );
}