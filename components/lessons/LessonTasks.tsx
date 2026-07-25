"use client";

import { useState } from "react";

import type { Schema } from "@/amplify/data/resource";
import LatexContent from "@/components/lessons/LatexContent";

type LessonTask = Schema["LessonTask"]["type"];

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
  const [isOpen, setIsOpen] = useState(false);
  const [isAnswerOpen, setIsAnswerOpen] =
    useState(false);
  const [isSolutionOpen, setIsSolutionOpen] =
    useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        onClick={() =>
          setIsOpen((previous) => !previous)
        }
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left transition-colors hover:bg-zinc-800/60"
      >
        <span className="text-lg font-medium">
          Zadanie {taskNumber}: {task.title}
        </span>

        <span
          className={`text-xl text-zinc-500 transition-transform duration-500 ${
            isOpen ? "rotate-45" : "rotate-0"
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
              <LatexContent content={task.content} />
            </div>

            {task.answer && (
              <div className="overflow-hidden rounded-lg border border-zinc-700">
                <button
                  type="button"
                  onClick={() =>
                    setIsAnswerOpen(
                      (previous) => !previous,
                    )
                  }
                  aria-expanded={isAnswerOpen}
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
                      <LatexContent
                        content={task.answer}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {task.solution && (
              <div className="overflow-hidden rounded-lg border border-zinc-700">
                <button
                  type="button"
                  onClick={() =>
                    setIsSolutionOpen(
                      (previous) => !previous,
                    )
                  }
                  aria-expanded={isSolutionOpen}
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
                      <LatexContent
                        content={task.solution}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LessonTasks({
  tasks,
}: LessonTasksProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <button
          type="button"
          onClick={() =>
            setIsOpen((previous) => !previous)
          }
          aria-expanded={isOpen}
          className="flex w-full cursor-pointer items-center justify-between px-6 py-5 text-left transition-colors hover:bg-zinc-900/70"
        >
          <div>
            <h2 className="text-2xl font-semibold">
              Zadania do lekcji
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Sprawdź wiedzę i zobacz pełne
              rozwiązania
            </p>
          </div>

          <span
            className={`text-2xl text-zinc-400 transition-transform duration-500 ${
              isOpen ? "rotate-45" : "rotate-0"
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
              {tasks.map((task, index) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  taskNumber={index + 1}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}