import type {
  getAdminLessonsByModuleId,
  getAdminModule,
} from "@/lib/services/admin-service";

export type AdminModule = NonNullable<
  Awaited<ReturnType<typeof getAdminModule>>
>;

export type AdminModuleLesson = Awaited<
  ReturnType<typeof getAdminLessonsByModuleId>
>[number];
