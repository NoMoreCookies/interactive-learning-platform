import {
  defineFunction,
} from "@aws-amplify/backend";

export const deleteAdminCourse =
  defineFunction({
    name:
      "delete-admin-course",

    resourceGroupName:
      "data",

    /*
     * Course deletion may require multiple paginated DynamoDB Query
     * calls followed by S3 cleanup. The operation remains bounded,
     * but 60 seconds gives enough room for retries without requiring
     * a separate workflow service at the current platform scale.
     */
    timeoutSeconds:
      60,
  });
