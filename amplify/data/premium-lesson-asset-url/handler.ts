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

import type {
  Schema,
} from "../resource";

import {
  env,
} from "$amplify/env/premium-lesson-asset-url";


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

  if (typeof value !== "boolean") {
    throw new Error(
      `Missing required boolean field: ${fieldName}`,
    );
  }

  return value;
}

function getIdentityGroups(
  identity: unknown,
): string[] {
  if (
    !identity ||
    typeof identity !== "object"
  ) {
    return [];
  }

  const identityRecord =
    identity as Record<
      string,
      unknown
    >;

  const directGroups =
    identityRecord.groups;

  if (
    Array.isArray(directGroups)
  ) {
    return directGroups.filter(
      (
        group,
      ): group is string =>
        typeof group ===
        "string",
    );
  }

  const claims =
    identityRecord.claims;

  if (
    !claims ||
    typeof claims !== "object"
  ) {
    return [];
  }

  const groupsClaim = (
    claims as Record<
      string,
      unknown
    >
  )["cognito:groups"];

  if (
    Array.isArray(groupsClaim)
  ) {
    return groupsClaim.filter(
      (
        group,
      ): group is string =>
        typeof group ===
        "string",
    );
  }

  if (
    typeof groupsClaim ===
    "string"
  ) {
    return groupsClaim
      .split(",")
      .map((group) =>
        group.trim(),
      )
      .filter(Boolean);
  }

  return [];
}

function assertAdmin(
  identity: unknown,
): void {
  const groups =
    getIdentityGroups(identity);

  if (
    !groups.includes("ADMIN")
  ) {
    throw new Error(
      "Unauthorized",
    );
  }
}

function normalizeAssetType(
  value: string,
): AssetType {
  const normalizedValue =
    value.trim().toUpperCase();

  if (
    normalizedValue === "VIDEO" ||
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
    !normalizedPath.startsWith(
      "courses/",
    ) ||
    normalizedPath.startsWith(
      "/",
    ) ||
    normalizedPath.includes(
      "..",
    ) ||
    normalizedPath.includes(
      "\\",
    )
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
    segments.length !== 4 ||
    segments.some(
      (segment) =>
        !segment.trim(),
    )
  ) {
    return false;
  }

  const fileName =
    segments[3].toLowerCase();

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

export const handler: Schema["getPremiumLessonAssetUrl"]["functionHandler"] =
  async (event) => {
    try {
      /*
       * AppSync already restricts this query to ADMIN.
       *
       * This second check is intentional defense in depth.
       */
      assertAdmin(
        event.identity,
      );

      const lessonId =
        event.arguments.lessonId.trim();

      if (!lessonId) {
        throw new Error(
          "Invalid lesson id",
        );
      }

      const assetType =
        normalizeAssetType(
          event.arguments.assetType,
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
        env.COURSE_PLATFORM_FILES_BUCKET_NAME;

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
                "#id": "id",
                "#moduleId":
                  "moduleId",
                "#published":
                  "published",
                "#assetPath":
                  assetAttribute,
              },
          }),
        );

      if (!lessonResult.Item) {
        return null;
      }

      const lessonPublished =
        getRequiredBoolean(
          lessonResult.Item,
          "published",
        );

      if (!lessonPublished) {
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
       * Do not trust even a path stored in the database blindly.
       *
       * A compromised/admin-mistyped record must not turn this
       * function into an arbitrary S3 object signer.
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

      if (!moduleResult.Item) {
        return null;
      }

      const modulePublished =
        getRequiredBoolean(
          moduleResult.Item,
          "published",
        );

      if (!modulePublished) {
        return null;
      }

      const courseId =
        getRequiredString(
          moduleResult.Item,
          "courseId",
        );

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

      if (!courseResult.Item) {
        return null;
      }

      const coursePublished =
        getRequiredBoolean(
          courseResult.Item,
          "published",
        );

      if (!coursePublished) {
        return null;
      }

      /*
       * Materials need only a short window because the user starts
       * a direct download immediately.
       *
       * Video needs a longer window because browsers may issue
       * additional Range requests while seeking/streaming.
       */
      const expiresIn =
        assetType === "VIDEO"
          ? 3600
          : 300;

      const getObjectCommand =
        new GetObjectCommand({
          Bucket: bucketName,
          Key: assetPath,

          ...(assetType ===
          "MATERIALS"
            ? {
                ResponseContentDisposition:
                  "attachment",
              }
            : {}),
        });

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
       * Do not log object keys, URLs, JWT claims or user data.
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