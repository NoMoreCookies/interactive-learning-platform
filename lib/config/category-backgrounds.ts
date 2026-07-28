export type Subject =
  | "MATHEMATICS"
  | "PHYSICS"
  | "COMPUTER_SCIENCE";

type EnterDirection = "left" | "right";

export type CategoryBackgroundConfig = {
  imagePath: string;

  width: string;
  height: string;

  top: string;
  right?: string;
  left?: string;

  scale: number;
  opacity: number;

  enterDirection: EnterDirection;
  enterDistance: number;

  transitionDurationMs: number;
};

export const categoryBackgrounds: Record<
  Subject,
  CategoryBackgroundConfig
> = {
  MATHEMATICS: {
    imagePath:
      "/categories/backgrounds/mathematics.png",

    width: "900px",
    height: "700px",

    top: "46%",
    right: "-50%",

    scale: 1.2,
    opacity: 1,

    enterDirection: "right",
    enterDistance: 140,

    transitionDurationMs: 650,
  },

  PHYSICS: {
    imagePath:
      "/categories/backgrounds/physics.png",

    width: "1100px",
    height: "760px",

    top: "48%",
    right: "-40%",

    scale: 1.2,
    opacity: 1,

    enterDirection: "right",
    enterDistance: 180,

    transitionDurationMs: 750,
  },

  COMPUTER_SCIENCE: {
    imagePath:
      "/categories/backgrounds/computer_science.png",

    width: "900px",
    height: "700px",

    top: "40%",
    right: "90%",

    scale: 1,
    opacity: 1,

    enterDirection: "left",
    enterDistance: 160,

    transitionDurationMs: 650,
  },
};