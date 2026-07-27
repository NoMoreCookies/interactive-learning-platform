import type { CourseSubject } from "@/types/course";
import type { CategoryModels } from "@/types/category";

export const categoryModels: CategoryModels = {
  MATHEMATICS: {
    path: "/models/mathematics.glb",
    scale: 4,
    cameraPosition: [0, 2, 5],
    rotationSpeed: 0.04,
    position: [0.5, 0, 0],
  },

  PHYSICS: {
    path: "/models/physics.glb",
    scale: 0.002,
    cameraPosition: [0, 2, 5.5],
    rotationSpeed: 0.03,
    position: [1.8, 0, 0],
  },

  COMPUTER_SCIENCE: {
    path: "/models/computer_science.glb",
    scale: 0.02,
    cameraPosition: [0, 2, 5],
    rotationSpeed: 0.05,
    position: [0.2, 0, 0],
  },
};