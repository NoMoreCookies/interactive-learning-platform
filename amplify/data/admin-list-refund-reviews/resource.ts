import { defineFunction } from "@aws-amplify/backend";
export const adminListRefundReviews = defineFunction({
  name: "admin-list-refund-reviews", entry: "./handler.ts", resourceGroupName: "data", timeoutSeconds: 30,
});
