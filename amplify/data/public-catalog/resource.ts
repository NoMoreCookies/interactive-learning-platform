import { defineFunction } from "@aws-amplify/backend";

export const publicCatalog =
  defineFunction({
    name: "public-catalog",
    entry: "./handler.ts",
    resourceGroupName: "data",
    timeoutSeconds: 10,
  });