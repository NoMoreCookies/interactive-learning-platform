import type { LessonUploadOption } from "@/lib/services/course-service";

type LessonSelectorProps = {
  lessons: LessonUploadOption[];
  selectedLessonId: string;
  isLoading: boolean;
  disabled?: boolean;
  onChange: (lessonId: string) => void;
};

export default function LessonSelector({
  lessons,
  selectedLessonId,
  isLoading,
  disabled = false,
  onChange,
}: LessonSelectorProps) {
  const selectedLesson =
    lessons.find(
      (lesson) =>
        lesson.lessonId === selectedLessonId,
    ) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="lesson"
          className="mb-2 block text-sm font-medium text-zinc-200"
        >
          Lekcja
        </label>

        <select
          id="lesson"
          value={selectedLessonId}
          onChange={(event) =>
            onChange(event.target.value)
          }
          disabled={
            disabled ||
            isLoading ||
            lessons.length === 0
          }
          className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading && (
            <option value="">
              Pobieranie lekcji...
            </option>
          )}

          {!isLoading &&
            lessons.length === 0 && (
              <option value="">
                Brak dostępnych lekcji
              </option>
            )}

          {lessons.map((lesson) => (
            <option
              key={lesson.lessonId}
              value={lesson.lessonId}
            >
              {lesson.courseTitle}
              {" → "}
              {lesson.moduleTitle}
              {" → "}
              {lesson.lessonTitle}
            </option>
          ))}
        </select>
      </div>

      {selectedLesson && (
        <div className="rounded-xl border border-zinc-800 bg-black p-4 text-sm text-zinc-400">
          <p>
            Kurs:{" "}
            <span className="text-zinc-200">
              {selectedLesson.courseTitle}
            </span>
          </p>

          <p className="mt-1">
            Moduł:{" "}
            <span className="text-zinc-200">
              {selectedLesson.moduleTitle}
            </span>
          </p>

          <p className="mt-1">
            Lekcja:{" "}
            <span className="text-zinc-200">
              {selectedLesson.lessonTitle}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}