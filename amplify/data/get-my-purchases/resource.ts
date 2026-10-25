import { defineFunction } from "@aws-amplify/backend";
export const getMyPurchases = defineFunction({
  name: "get-my-purchases",
  entry: "./handler.ts",
  resourceGroupName: "data",
  timeoutSeconds: 15,
});
