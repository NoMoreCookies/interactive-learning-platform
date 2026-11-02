import {
  defineFunction,
} from "@aws-amplify/backend";

export const premiumLessonAssetUrl =
  defineFunction({
    name: "premium-lesson-asset-url",
    entry: "./handler.ts",
    resourceGroupName: "data",
    timeoutSeconds: 10,
  });