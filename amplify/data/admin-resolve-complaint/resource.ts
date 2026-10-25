import { defineFunction } from "@aws-amplify/backend";
export const adminResolveComplaint = defineFunction({
  name: "admin-resolve-complaint",
  entry: "./handler.ts",
  resourceGroupName: "data",
  timeoutSeconds: 15,
});
