import { defineFunction } from "@aws-amplify/backend";
export const getMyComplaints = defineFunction({
  name: "get-my-complaints",
  entry: "./handler.ts",
  resourceGroupName: "data",
  timeoutSeconds: 15,
});
