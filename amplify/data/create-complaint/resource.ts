import { defineFunction } from "@aws-amplify/backend";

export const createComplaint = defineFunction({
  name: "create-complaint",
  entry: "./handler.ts",
  resourceGroupName: "data",
  timeoutSeconds: 15,
});
