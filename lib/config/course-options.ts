import type {
  CourseLevel,
  CourseSubject,
} from "@/lib/services/admin-service";

export type CourseOption<T extends string> = {
  value: T;
  label: string;
};

export const COURSE_SUBJECT_OPTIONS = [
  {
    value: "MATHEMATICS",
    label: "Matematyka",
  },
  {
    value: "PHYSICS",
    label: "Fizyka",
  },
  {
    value: "COMPUTER_SCIENCE",
    label: "Informatyka",
  },
] as const satisfies readonly CourseOption<CourseSubject>[];

export const COURSE_LEVEL_OPTIONS = [
  {
    value: "BASIC",
    label: "Podstawowy",
  },
  {
    value: "EXTENDED",
    label: "Rozszerzony",
  },
] as const satisfies readonly CourseOption<CourseLevel>[];
