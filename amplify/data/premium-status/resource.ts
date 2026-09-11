import {
  defineFunction,
} from "@aws-amplify/backend";

export const premiumStatus =
  defineFunction({
    name: "premium-status",
    entry: "./handler.ts",
    resourceGroupName: "data",
  });