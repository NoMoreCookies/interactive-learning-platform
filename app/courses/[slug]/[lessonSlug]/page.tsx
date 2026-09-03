"use client";

import {
  use,
  useEffect,
  useState,
} from "react";

import {
  useAuth,
} from "@/components/auth/AuthProvider";

import LessonNavigation from "@/components/lessons/LessonNavigation";
import LessonNotes from "@/components/lessons/LessonNotes";
import LessonTasks from "@/components/lessons/LessonTasks";

import {
  getLessonPageData,
  getPremiumLessonAssetUrl,
  getPremiumLessonContent,
} from "@/lib/services/lesson-service";

type LessonPageProps = {
  params: Promise<{
    slug: string;
    lessonSlug: string;
  }>;
};

type LessonPageData =
  NonNullable<
    Awaited<
      ReturnType<
        typeof getLessonPageData
      >
    >
  >;

type PremiumLessonContent =
  NonNullable<
    Awaited<
      ReturnType<
        typeof getPremiumLessonContent
      >
    >
  >;

export default function LessonPage({
  params,
}: LessonPageProps) {
  const {
    slug,
    lessonSlug,
  } = use(params);

  const {
    isAdmin,
    isLoading: isAuthLoading,
  } = useAuth();

  const [
    pageData,
    setPageData,
  ] =
    useState<LessonPageData | null>(
      null,
    );

  const [
    premiumContent,
    setPremiumContent,
  ] =
    useState<PremiumLessonContent | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isPremiumLoading,
    setIsPremiumLoading,
  ] = useState(false);

  const [
    premiumError,
    setPremiumError,
  ] = useState("");

  const [
    videoUrl,
    setVideoUrl,
  ] = useState("");

  const [
    videoError,
    setVideoError,
  ] = useState("");

  const [
    isVideoLoading,
    setIsVideoLoading,
  ] = useState(false);

  const [
    isDownloadingMaterials,
    setIsDownloadingMaterials,
  ] = useState(false);

  const [
    materialsError,
    setMaterialsError,
  ] = useState("");

  /*
   * Load the public portion of the lesson.
   */
  useEffect(() => {
    let isCancelled = false;

    async function loadLesson() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result =
          await getLessonPageData(
            slug,
            lessonSlug,
          );

        if (isCancelled) {
          return;
        }

        if (!result) {
          setPageData(null);

          setErrorMessage(
            "Nie znaleziono takiej lekcji.",
          );

          return;
        }

        setPageData(result);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.error(
          "Nie udało się pobrać publicznych danych lekcji:",
          error,
        );

        setPageData(null);

        setErrorMessage(
          "Nie udało się pobrać lekcji.",
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadLesson();

    return () => {
      isCancelled = true;
    };
  }, [
    slug,
    lessonSlug,
  ]);

  /*
   * Premium data is currently requested only for ADMIN.
   *
   * This frontend condition is only an optimization.
   * AppSync and Lambda remain the actual authorization boundary.
   */
  useEffect(() => {
    let isCancelled = false;

    async function loadPremiumContent() {
      if (isAuthLoading) {
        return;
      }

      if (
        !isAdmin ||
        !pageData?.lesson.id
      ) {
        setPremiumContent(null);
        setPremiumError("");
        return;
      }

      setIsPremiumLoading(true);
      setPremiumError("");

      try {
        const result =
          await getPremiumLessonContent(
            pageData.lesson.id,
          );

        if (isCancelled) {
          return;
        }

        setPremiumContent(result);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.error(
          "Nie udało się pobrać treści premium lekcji:",
          error,
        );

        setPremiumContent(null);

        setPremiumError(
          "Nie udało się pobrać treści premium.",
        );
      } finally {
        if (!isCancelled) {
          setIsPremiumLoading(false);
        }
      }
    }

    void loadPremiumContent();

    return () => {
      isCancelled = true;
    };
  }, [
    isAdmin,
    isAuthLoading,
    pageData?.lesson.id,
  ]);

  /*
   * Request a temporary video URL through the secured backend.
   *
   * No S3 object path is available to this component.
   */
  useEffect(() => {
    let isCancelled = false;

    async function loadVideoUrl() {
      const lessonId =
        pageData?.lesson.id;

      const hasVideo =
        premiumContent?.hasVideo ??
        false;

      if (!lessonId || !hasVideo) {
        setVideoUrl("");
        setVideoError("");
        setIsVideoLoading(false);
        return;
      }

      setIsVideoLoading(true);
      setVideoError("");

      try {
        const url =
          await getPremiumLessonAssetUrl(
            lessonId,
            "VIDEO",
          );

        if (isCancelled) {
          return;
        }

        if (!url) {
          setVideoUrl("");

          setVideoError(
            "Film nie jest dostępny.",
          );

          return;
        }

        setVideoUrl(url);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.error(
          "Nie udało się pobrać URL filmu:",
          error,
        );

        setVideoUrl("");

        setVideoError(
          "Nie udało się załadować filmu.",
        );
      } finally {
        if (!isCancelled) {
          setIsVideoLoading(false);
        }
      }
    }

    void loadVideoUrl();

    return () => {
      isCancelled = true;
    };
  }, [
    pageData?.lesson.id,
    premiumContent?.hasVideo,
  ]);

  /*
   * Request a temporary materials URL through the secured backend.
   */
  async function handleDownloadMaterials() {
    const lessonId =
      pageData?.lesson.id;

    const hasMaterials =
      premiumContent
        ?.hasMaterials ??
      false;

    if (!lessonId) {
      setMaterialsError(
        "Nie udało się ustalić lekcji.",
      );

      return;
    }

    if (!hasMaterials) {
      setMaterialsError(
        "Ta lekcja nie ma przypisanych materiałów.",
      );

      return;
    }

    setIsDownloadingMaterials(true);
    setMaterialsError("");

    try {
      const url =
        await getPremiumLessonAssetUrl(
          lessonId,
          "MATERIALS",
        );

      if (!url) {
        throw new Error(
          "Materiały nie są dostępne.",
        );
      }

      const link =
        document.createElement("a");

      link.href = url;
      link.download = "";
      link.rel = "noreferrer";

      document.body.appendChild(
        link,
      );

      link.click();
      link.remove();
    } catch (error) {
      console.error(
        "Nie udało się pobrać materiałów:",
        error,
      );

      setMaterialsError(
        "Nie udało się pobrać materiałów.",
      );
    } finally {
      setIsDownloadingMaterials(
        false,
      );
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-20">
        <p className="text-zinc-400">
          Pobieranie lekcji...
        </p>
      </main>
    );
  }

  if (
    errorMessage ||
    !pageData
  ) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-20">
        <h1 className="text-3xl font-bold">
          Nie znaleziono lekcji
        </h1>

        <p className="mt-4 text-zinc-400">
          {errorMessage ||
            "Wybrana lekcja nie istnieje."}
        </p>
      </main>
    );
  }

  const {
    course,
    courseModule,
    lesson,
    navigation,
  } = pageData;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <header>
        <p className="text-sm text-zinc-400">
          {course.title}
        </p>

        <h1 className="mt-2 text-4xl font-bold">
          {lesson.title}
        </h1>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-400">
          <span>
            Lekcja{" "}
            {navigation.lessonNumber} z{" "}
            {navigation.totalLessons}
          </span>

          <span>
            Moduł:{" "}
            {courseModule.title}
          </span>

          {lesson.durationMinutes !=
            null && (
            <span>
              {
                lesson.durationMinutes
              }{" "}
              min
            </span>
          )}
        </div>

        {lesson.description && (
          <p className="mt-4 text-lg text-zinc-300">
            {lesson.description}
          </p>
        )}
      </header>

      {isAuthLoading ? (
        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-8">
          <p className="text-zinc-400">
            Sprawdzanie dostępu...
          </p>
        </section>
      ) : isAdmin ? (
        <>
          {isPremiumLoading && (
            <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-8">
              <p className="text-zinc-400">
                Ładowanie treści premium...
              </p>
            </section>
          )}

          {premiumError && (
            <section className="mt-10 rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
              <p className="text-red-300">
                {premiumError}
              </p>
            </section>
          )}

          {premiumContent && (
            <>
              {premiumContent.hasVideo && (
                <section className="mt-10">
                  {isVideoLoading && (
                    <div className="flex aspect-video items-center justify-center rounded-2xl bg-black">
                      <p className="text-zinc-400">
                        Ładowanie filmu...
                      </p>
                    </div>
                  )}

                  {!isVideoLoading &&
                    videoUrl && (
                    <video
                      key={videoUrl}
                      controls
                      preload="metadata"
                      className="aspect-video w-full rounded-2xl bg-black"
                    >
                      <source
                        src={videoUrl}
                        type="video/mp4"
                      />

                      Twoja przeglądarka
                      nie obsługuje
                      odtwarzania wideo.
                    </video>
                  )}

                  {videoError && (
                    <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">
                      {videoError}
                    </p>
                  )}
                </section>
              )}

              <LessonNotes
                notes={
                  premiumContent.notes
                }
              />

              <LessonTasks
                tasks={
                  premiumContent.tasks
                }
              />

              {premiumContent.hasMaterials && (
                <section className="mt-10">
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={
                        handleDownloadMaterials
                      }
                      disabled={
                        isDownloadingMaterials
                      }
                      className="group flex w-full max-w-md cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-white bg-zinc-950 px-6 py-5 text-center text-lg font-medium text-white transition-all duration-200 hover:bg-zinc-900 hover:shadow-[0_0_24px_rgba(255,255,255,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-6 w-6 transition-transform duration-200 group-hover:translate-y-0.5"
                      >
                        <path
                          d="M12 3v12m0 0 5-5m-5 5-5-5M5 17v3h14v-3"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>

                      <span>
                        {isDownloadingMaterials
                          ? "Przygotowywanie pliku..."
                          : "Pobierz materiały z lekcji"}
                      </span>
                    </button>
                  </div>

                  {materialsError && (
                    <p className="mt-4 text-center text-sm text-red-400">
                      {materialsError}
                    </p>
                  )}
                </section>
              )}
            </>
          )}
        </>
      ) : (
        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-8">
          <h2 className="text-xl font-semibold text-zinc-100">
            Treść premium
          </h2>

          <p className="mt-3 leading-7 text-zinc-400">
            Materiały premium tej
            lekcji są obecnie
            niedostępne.
          </p>
        </section>
      )}

      <LessonNavigation
        courseSlug={course.slug}
        previousLesson={
          navigation.previousLesson
        }
        nextLesson={
          navigation.nextLesson
        }
      />
    </main>
  );
}