import {
  defineFunction,
} from "@aws-amplify/backend";

export const checkoutStatus =
  defineFunction({
    name: "checkout-status",
    entry: "./handler.ts",
    resourceGroupName: "data",
  });