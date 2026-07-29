import type {
  getAdminCourse,
  getAdminCourses,
  getAdminModulesByCourseId,
} from "@/lib/services/admin-service";

export type AdminCourseListItem = Awaited<
  ReturnType<typeof getAdminCourses>
>[number];

export type AdminCourse = NonNullable<
  Awaited<ReturnType<typeof getAdminCourse>>
>;

export type AdminCourseModule = Awaited<
  ReturnType<typeof getAdminModulesByCourseId>
>[number];
