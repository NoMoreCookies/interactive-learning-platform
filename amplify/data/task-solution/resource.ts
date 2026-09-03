import {
  defineFunction,
} from "@aws-amplify/backend";

export const taskSolution =
  defineFunction({
    name: "task-solution",
    entry: "./handler.ts",
    resourceGroupName: "data",
  });