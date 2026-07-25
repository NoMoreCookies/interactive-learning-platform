"use client";

import { useState } from "react";

import type { Schema } from "@/amplify/data/resource";
import LatexContent from "@/components/lessons/LatexContent";

type LessonNote = Schema["LessonNote"]["type"];

type LessonNotesProps = {
  notes: LessonNote[];
};

type NoteItemProps = {
  note: LessonNote;
};

function NoteItem({ note }: NoteItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left transition-colors hover:bg-zinc-800/60"
      >
        <span className="text-lg font-medium">
          {note.title}
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
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-zinc-800 px-5 py-5 text-zinc-300">
            <LatexContent content={note.content} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LessonNotes({
  notes,
}: LessonNotesProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (notes.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <button
          type="button"
          onClick={() => setIsOpen((previous) => !previous)}
          aria-expanded={isOpen}
          className="flex w-full cursor-pointer items-center justify-between px-6 py-5 text-left transition-colors hover:bg-zinc-900/70"
        >
          <div>
            <h2 className="text-2xl font-semibold">
              Notatki do lekcji
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Definicje, wzory i najważniejsze informacje
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
            isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="space-y-4 border-t border-zinc-800 px-6 py-5">
              {notes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}