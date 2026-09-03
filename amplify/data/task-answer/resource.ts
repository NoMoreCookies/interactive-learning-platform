import {
  defineFunction,
} from "@aws-amplify/backend";

export const taskAnswer =
  defineFunction({
    name: "task-answer",
    entry: "./handler.ts",
    resourceGroupName: "data",
  });