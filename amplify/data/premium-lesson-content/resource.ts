import {
  defineFunction,
} from "@aws-amplify/backend";

export const premiumLessonContent =
  defineFunction({
    name: "premium-lesson-content",
    entry: "./handler.ts",
    resourceGroupName: "data",
  });