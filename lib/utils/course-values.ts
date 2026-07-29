import {
  COURSE_LEVEL_OPTIONS,
  COURSE_SUBJECT_OPTIONS,
} from "@/lib/config/course-options";

import type {
  CourseLevel,
  CourseSubject,
} from "@/lib/services/admin-service";

export function parseCourseSubject(
  value: string | null | undefined,
): CourseSubject | null {
  return COURSE_SUBJECT_OPTIONS.some(
    (option) => option.value === value,
  )
    ? (value as CourseSubject)
    : null;
}

export function parseCourseLevel(
  value: string | null | undefined,
): CourseLevel | null {
  return COURSE_LEVEL_OPTIONS.some(
    (option) => option.value === value,
  )
    ? (value as CourseLevel)
    : null;
}

export function getCourseSubjectLabel(
  value: string | null | undefined,
): string {
  return (
    COURSE_SUBJECT_OPTIONS.find(
      (option) => option.value === value,
    )?.label ?? "Brak przedmiotu"
  );
}

export function getCourseLevelLabel(
  value: string | null | undefined,
): string {
  return (
    COURSE_LEVEL_OPTIONS.find(
      (option) => option.value === value,
    )?.label ?? "Brak poziomu"
  );
}
