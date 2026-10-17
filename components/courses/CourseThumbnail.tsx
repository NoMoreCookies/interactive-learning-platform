"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getCourseThumbnailUrl,
} from "@/lib/services/storage-service";

type CourseThumbnailProps = {
  path: string | null | undefined;
  courseTitle: string;
};

export default function CourseThumbnail({
  path,
  courseTitle,
}: CourseThumbnailProps) {
  const [
    imageUrl,
    setImageUrl,
  ] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadThumbnail() {
      if (!path) {
        setImageUrl("");
        return;
      }

      try {
        const url =
          await getCourseThumbnailUrl(
            path,
          );

        if (!isCancelled) {
          setImageUrl(url);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.error(
          "Nie udało się pobrać miniaturki kursu.",
          {
            errorName:
              error instanceof Error
                ? error.name
                : "UnknownError",
          },
        );

        setImageUrl("");
      }
    }

    void loadThumbnail();

    return () => {
      isCancelled = true;
    };
  }, [path]);

  return (
    <div className="aspect-video overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`Miniaturka kursu ${courseTitle}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-600">
          Miniaturka kursu
        </div>
      )}
    </div>
  );
}
