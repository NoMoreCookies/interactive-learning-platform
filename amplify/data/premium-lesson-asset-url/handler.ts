import {
  DynamoDBClient,
  GetItemCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";

import {
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import {
  getSignedUrl,
} from "@aws-sdk/s3-request-presigner";

import {
  env,
} from "$amplify/env/premium-lesson-asset-url";

import {
  hasPremiumAccess,
} from "../../shared/premium-access";

import type {
  Schema,
} from "../resource";

const dynamoDbClient =
  new DynamoDBClient({});

const s3Client =
  new S3Client({});

type AssetType =
  | "VIDEO"
  | "MATERIALS";

function getRequiredEnvironmentVariable(
  name: string,
): string {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}`,
    );
  }

  return value;
}

function getRequiredString(
  item:
    | Record<
        string,
        AttributeValue
      >
    | undefined,
  fieldName: string,
): string {
  const value =
    item?.[fieldName]?.S;

  if (!value) {
    throw new Error(
      `Missing required field: ${fieldName}`,
    );
  }

  return value;
}

function getOptionalString(
  item:
    | Record<
        string,
        AttributeValue
      >
    | undefined,
  fieldName: string,
): string | null {
  return (
    item?.[fieldName]?.S ??
    null
  );
}

function getRequiredBoolean(
  item:
    | Record<
        string,
        AttributeValue
      >
    | undefined,
  fieldName: string,
): boolean {
  const value =
    item?.[fieldName]?.BOOL;

  if (
    typeof value !==
    "boolean"
  ) {
    throw new Error(
      `Missing required boolean field: ${fieldName}`,
    );
  }

  return value;
}

function normalizeAssetType(
  value: string,
): AssetType {
  const normalizedValue =
    value
      .trim()
      .toUpperCase();

  if (
    normalizedValue ===
      "VIDEO" ||
    normalizedValue ===
      "MATERIALS"
  ) {
    return normalizedValue;
  }

  throw new Error(
    "Invalid asset type",
  );
}

function isExpectedAssetPath(
  path: string,
  assetType: AssetType,
): boolean {
  const normalizedPath =
    path.trim();

  if (
    normalizedPath !== path ||
    !normalizedPath.startsWith("courses/") ||
    normalizedPath.startsWith("/") ||
    normalizedPath.includes("..") ||
    normalizedPath.includes("\\")
  ) {
    return false;
  }

  const segments =
    normalizedPath.split("/");

  /*
   * Expected structure:
   *
   * courses/{courseSlug}/{lessonSlug}/{fileName}
   */
    if (
      segments.length !== 5 ||
      segments[0] !== "courses" ||
      segments[2] !== "lessons" ||
      segments.some(
        (segment) => !segment.trim(),
      )
    ) {
      return false;
    }

    const fileName = segments[4].toLowerCase();

  if (
    assetType === "VIDEO"
  ) {
    return fileName.endsWith(
      ".mp4",
    );
  }

  return fileName.endsWith(
    ".zip",
  );
}

export const handler:
  Schema["getPremiumLessonAssetUrl"]["functionHandler"] =
  async (event) => {
    try {
      const entitlementTableName =
        getRequiredEnvironmentVariable(
          "ENTITLEMENT_TABLE_NAME",
        );

      /*
       * Authorization boundary:
       *
       * 1. AppSync requires an authenticated Cognito user.
       * 2. This Lambda independently verifies either:
       *    - ADMIN membership, or
       *    - a current PREMIUM entitlement.
       *
       * The entitlement lookup uses the Cognito identity from
       * AppSync. The browser never provides its own userId.
       */
      const premiumAccessAllowed =
        await hasPremiumAccess({
          identity:
            event.identity,

          entitlementTableName,
        });

      if (
        !premiumAccessAllowed
      ) {
        console.warn(
          "Premium lesson asset request rejected.",
        );

        throw new Error(
          "Unauthorized",
        );
      }

      const lessonId =
        event.arguments
          .lessonId
          .trim();

      if (!lessonId) {
        throw new Error(
          "Invalid lesson id",
        );
      }

      const assetType =
        normalizeAssetType(
          event.arguments
            .assetType,
        );

      const courseTableName =
        getRequiredEnvironmentVariable(
          "COURSE_TABLE_NAME",
        );

      const moduleTableName =
        getRequiredEnvironmentVariable(
          "MODULE_TABLE_NAME",
        );

      const lessonTableName =
        getRequiredEnvironmentVariable(
          "LESSON_TABLE_NAME",
        );

      /*
       * Added automatically by Amplify because Storage grants
       * this function read access through allow.resource(...).
       */
      const bucketName =
        env
          .COURSE_PLATFORM_FILES_BUCKET_NAME;

      const assetAttribute =
        assetType === "VIDEO"
          ? "videoPath"
          : "materialsPath";

      /*
       * Read only the requested asset path.
       *
       * VIDEO never needs to read materialsPath and MATERIALS
       * never needs to read videoPath.
       */
      const lessonResult =
        await dynamoDbClient.send(
          new GetItemCommand({
            TableName:
              lessonTableName,

            Key: {
              id: {
                S: lessonId,
              },
            },

            ProjectionExpression:
              "#id, #moduleId, #published, #assetPath",

            ExpressionAttributeNames:
              {
                "#id":
                  "id",

                "#moduleId":
                  "moduleId",

                "#published":
                  "published",

                "#assetPath":
                  assetAttribute,
              },
          }),
        );

      if (
        !lessonResult.Item
      ) {
        return null;
      }

      /*
       * Premium access never grants access to unpublished
       * lessons.
       */
      const lessonPublished =
        getRequiredBoolean(
          lessonResult.Item,
          "published",
        );

      if (
        !lessonPublished
      ) {
        return null;
      }

      const moduleId =
        getRequiredString(
          lessonResult.Item,
          "moduleId",
        );

      const assetPath =
        getOptionalString(
          lessonResult.Item,
          assetAttribute,
        );

      if (!assetPath) {
        return null;
      }

      /*
       * Do not trust even an S3 key stored in DynamoDB blindly.
       *
       * A corrupted or incorrectly configured database record
       * must not turn this function into an arbitrary S3 signer.
       */
      if (
        !isExpectedAssetPath(
          assetPath,
          assetType,
        )
      ) {
        throw new Error(
          "Invalid stored asset path",
        );
      }

      /*
       * Verify Module publication.
       */
      const moduleResult =
        await dynamoDbClient.send(
          new GetItemCommand({
            TableName:
              moduleTableName,

            Key: {
              id: {
                S: moduleId,
              },
            },

            ProjectionExpression:
              "#courseId, #published",

            ExpressionAttributeNames:
              {
                "#courseId":
                  "courseId",

                "#published":
                  "published",
              },
          }),
        );

      if (
        !moduleResult.Item
      ) {
        return null;
      }

      const modulePublished =
        getRequiredBoolean(
          moduleResult.Item,
          "published",
        );

      if (
        !modulePublished
      ) {
        return null;
      }

      const courseId =
        getRequiredString(
          moduleResult.Item,
          "courseId",
        );

      /*
       * Verify Course publication.
       */
      const courseResult =
        await dynamoDbClient.send(
          new GetItemCommand({
            TableName:
              courseTableName,

            Key: {
              id: {
                S: courseId,
              },
            },

            ProjectionExpression:
              "#published",

            ExpressionAttributeNames:
              {
                "#published":
                  "published",
              },
          }),
        );

      if (
        !courseResult.Item
      ) {
        return null;
      }

      const coursePublished =
        getRequiredBoolean(
          courseResult.Item,
          "published",
        );

      if (
        !coursePublished
      ) {
        return null;
      }

      /*
      * Defense in depth:
      * Ensure the stored S3 key belongs to the exact
      * course and lesson resolved from DynamoDB.
      */
      const assetSegments = assetPath.split("/");

      if (
        assetSegments[1] !== courseId ||
        assetSegments[3] !== lessonId
      ) {
        throw new Error(
          "Stored asset path does not match lesson hierarchy",
        );
      }

      /*
       * Materials need only a short URL lifetime because the
       * download starts immediately.
       *
       * Video needs a longer window because browsers may issue
       * additional Range requests while streaming or seeking.
       */
      const expiresIn =
        assetType === "VIDEO"
          ? 3600
          : 300;

      const getObjectCommand =
        new GetObjectCommand({
          Bucket:
            bucketName,

          Key:
            assetPath,

          ...(assetType ===
          "MATERIALS"
            ? {
                ResponseContentDisposition:
                  "attachment",
              }
            : {}),
        });

      /*
       * The S3 object key never leaves the backend.
       *
       * The browser receives only a short-lived signed URL for
       * the exact object associated with this published lesson.
       */
      const signedUrl =
        await getSignedUrl(
          s3Client,
          getObjectCommand,
          {
            expiresIn,
          },
        );

      return signedUrl;
    } catch (error) {
      /*
       * Do not log:
       *
       * - S3 object keys,
       * - signed URLs,
       * - JWT claims,
       * - Cognito user IDs,
       * - entitlement contents.
       */
      console.error(
        "premium-lesson-asset-url failed",
        {
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },
      );

      throw new Error(
        "Nie udało się uzyskać dostępu do pliku.",
      );
    }
  };