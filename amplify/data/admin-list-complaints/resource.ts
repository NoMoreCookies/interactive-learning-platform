import { defineFunction } from "@aws-amplify/backend";
export const adminListComplaints = defineFunction({
  name: "admin-list-complaints",
  entry: "./handler.ts",
  resourceGroupName: "data",
  timeoutSeconds: 15,
});
