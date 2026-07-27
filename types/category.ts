import type { CourseSubject } from "./course";

export type CategoryModelConfig = {
  path: string;
  scale: number;
  cameraPosition: [number, number, number];
  rotationSpeed?: number;
  position?: [number, number, number];
};

export type CategoryModels = Record<
  CourseSubject,
  CategoryModelConfig
>;