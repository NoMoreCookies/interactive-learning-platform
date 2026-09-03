import {
  defineFunction,
} from "@aws-amplify/backend";

export const publicCourseOutline =
  defineFunction({
    name: "public-course-outline",
    entry: "./handler.ts",
    resourceGroupName: "data",
  });