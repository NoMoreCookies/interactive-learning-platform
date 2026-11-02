import {
  defineFunction,
} from "@aws-amplify/backend";

export const deleteAdminCourse =
  defineFunction({
    name:
      "delete-admin-course",

    resourceGroupName:
      "data",

    // Synchronous work is capped below AppSync's 30s request deadline.
    // Large deletions need a separate asynchronous workflow (AUD-006).
    timeoutSeconds: 28,
  });
