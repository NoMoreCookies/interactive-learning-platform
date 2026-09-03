"use client";

import { useState } from "react";

import LatexContent from "@/components/lessons/LatexContent";

import {
  getTaskAnswer,
  getTaskSolution,
  type getPremiumLessonContent,
} from "@/lib/services/lesson-service";

type PremiumLessonContent =
  NonNullable<
    Awaited<
      ReturnType<
        typeof getPremiumLessonContent
      >
    >
  >;

type LessonTask =
  PremiumLessonContent["tasks"][number];

type LessonTasksProps = {
  tasks: LessonTask[];
};

type TaskItemProps = {
  task: LessonTask;
  taskNumber: number;
};

function TaskItem({
  task,
  taskNumber,
}: TaskItemProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const [
    isAnswerOpen,
    setIsAnswerOpen,
  ] = useState(false);

  const [
    isSolutionOpen,
    setIsSolutionOpen,
  ] = useState(false);

  const [
    answer,
    setAnswer,
  ] = useState<string | null>(null);

  const [
    solution,
    setSolution,
  ] = useState<string | null>(null);

  const [
    isAnswerLoaded,
    setIsAnswerLoaded,
  ] = useState(false);

  const [
    isSolutionLoaded,
    setIsSolutionLoaded,
  ] = useState(false);

  const [
    isAnswerLoading,
    setIsAnswerLoading,
  ] = useState(false);

  const [
    isSolutionLoading,
    setIsSolutionLoading,
  ] = useState(false);

  const [
    answerError,
    setAnswerError,
  ] = useState("");

  const [
    solutionError,
    setSolutionError,
  ] = useState("");

  async function handleToggleAnswer() {
    const willOpen =
      !isAnswerOpen;

    setIsAnswerOpen(willOpen);

    if (
      !willOpen ||
      isAnswerLoaded ||
      isAnswerLoading
    ) {
      return;
    }

    setIsAnswerLoading(true);
    setAnswerError("");

    try {
      const result =
        await getTaskAnswer(
          task.id,
        );

      setAnswer(
        result?.answer ?? null,
      );

      setIsAnswerLoaded(true);
    } catch (error) {
      console.error(
        "Nie udało się pobrać odpowiedzi:",
        error,
      );

      setAnswerError(
        "Nie udało się pobrać odpowiedzi.",
      );
    } finally {
      setIsAnswerLoading(false);
    }
  }

  async function handleToggleSolution() {
    const willOpen =
      !isSolutionOpen;

    setIsSolutionOpen(willOpen);

    if (
      !willOpen ||
      isSolutionLoaded ||
      isSolutionLoading
    ) {
      return;
    }

    setIsSolutionLoading(true);
    setSolutionError("");

    try {
      const result =
        await getTaskSolution(
          task.id,
        );

      setSolution(
        result?.solution ?? null,
      );

      setIsSolutionLoaded(true);
    } catch (error) {
      console.error(
        "Nie udało się pobrać rozwiązania:",
        error,
      );

      setSolutionError(
        "Nie udało się pobrać rozwiązania.",
      );
    } finally {
      setIsSolutionLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        onClick={() =>
          setIsOpen(
            (previous) => !previous,
          )
        }
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left transition-colors hover:bg-zinc-800/60"
      >
        <span className="text-lg font-medium">
          Zadanie {taskNumber}:{" "}
          {task.title}
        </span>

        <span
          className={`text-xl text-zinc-500 transition-transform duration-500 ${
            isOpen
              ? "rotate-45"
              : "rotate-0"
          }`}
        >
          +
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
          isOpen
            ? "grid-rows-[1fr]"
            : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-5 border-t border-zinc-800 px-5 py-5">
            <div className="text-zinc-300">
              <LatexContent
                content={task.content}
              />
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-700">
              <button
                type="button"
                onClick={
                  handleToggleAnswer
                }
                aria-expanded={
                  isAnswerOpen
                }
                className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-800/60"
              >
                <span className="font-medium">
                  Pokaż odpowiedź
                </span>

                <span
                  className={`text-lg transition-transform duration-500 ${
                    isAnswerOpen
                      ? "rotate-45"
                      : "rotate-0"
                  }`}
                >
                  +
                </span>
              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
                  isAnswerOpen
                    ? "grid-rows-[1fr]"
                    : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-zinc-700 px-4 py-4 text-zinc-300">
                    {isAnswerLoading ? (
                      <p className="text-zinc-400">
                        Pobieranie
                        odpowiedzi...
                      </p>
                    ) : answerError ? (
                      <p className="text-red-400">
                        {answerError}
                      </p>
                    ) : isAnswerLoaded ? (
                      answer ? (
                        <LatexContent
                          content={answer}
                        />
                      ) : (
                        <p className="text-zinc-400">
                          Brak zapisanej
                          odpowiedzi.
                        </p>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-700">
              <button
                type="button"
                onClick={
                  handleToggleSolution
                }
                aria-expanded={
                  isSolutionOpen
                }
                className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-800/60"
              >
                <span className="font-medium">
                  Pokaż rozwiązanie
                </span>

                <span
                  className={`text-lg transition-transform duration-500 ${
                    isSolutionOpen
                      ? "rotate-45"
                      : "rotate-0"
                  }`}
                >
                  +
                </span>
              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
                  isSolutionOpen
                    ? "grid-rows-[1fr]"
                    : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-zinc-700 px-4 py-4 text-zinc-300">
                    {isSolutionLoading ? (
                      <p className="text-zinc-400">
                        Pobieranie
                        rozwiązania...
                      </p>
                    ) : solutionError ? (
                      <p className="text-red-400">
                        {solutionError}
                      </p>
                    ) : isSolutionLoaded ? (
                      solution ? (
                        <LatexContent
                          content={
                            solution
                          }
                        />
                      ) : (
                        <p className="text-zinc-400">
                          Brak zapisanego
                          rozwiązania.
                        </p>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LessonTasks({
  tasks,
}: LessonTasksProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <button
          type="button"
          onClick={() =>
            setIsOpen(
              (previous) => !previous,
            )
          }
          aria-expanded={isOpen}
          className="flex w-full cursor-pointer items-center justify-between px-6 py-5 text-left transition-colors hover:bg-zinc-900/70"
        >
          <div>
            <h2 className="text-2xl font-semibold">
              Zadania do lekcji
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Sprawdź wiedzę,
              odpowiedzi i pełne
              rozwiązania
            </p>
          </div>

          <span
            className={`text-2xl text-zinc-400 transition-transform duration-500 ${
              isOpen
                ? "rotate-45"
                : "rotate-0"
            }`}
          >
            +
          </span>
        </button>

        <div
          className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
            isOpen
              ? "grid-rows-[1fr]"
              : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="space-y-4 border-t border-zinc-800 px-6 py-5">
              {tasks.map(
                (task, index) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    taskNumber={
                      index + 1
                    }
                  />
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}