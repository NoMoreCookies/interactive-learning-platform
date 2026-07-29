import type {
  getAdminCourse,
  getAdminLesson,
  getAdminLessonNotes,
  getAdminLessonTasks,
  getAdminModule,
} from "@/lib/services/admin-service";

export type AdminLesson = NonNullable<
  Awaited<ReturnType<typeof getAdminLesson>>
>;

export type AdminLessonNote = Awaited<
  ReturnType<typeof getAdminLessonNotes>
>[number];

export type AdminLessonTask = Awaited<
  ReturnType<typeof getAdminLessonTasks>
>[number];

export type AdminModule = NonNullable<
  Awaited<ReturnType<typeof getAdminModule>>
>;

export type AdminCourse = NonNullable<
  Awaited<ReturnType<typeof getAdminCourse>>
>;
