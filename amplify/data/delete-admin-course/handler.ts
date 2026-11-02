import { boundedAwsOptions, budgetedClient, resolverBudget, withResolverBudget } from "../../shared/resolver-budget";
import {
  BatchWriteItemCommand,
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  type AttributeValue,
  type WriteRequest,
} from "@aws-sdk/client-dynamodb";

import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

import {
  env,
} from "$amplify/env/delete-admin-course";

import type {
  Schema,
} from "../resource";

const dynamoDb =
  budgetedClient(new DynamoDBClient(boundedAwsOptions));

const s3 =
  budgetedClient(new S3Client(boundedAwsOptions));

const RESOURCE_ID_PATTERN =
  /^[A-Za-z0-9_-]{1,128}$/;

const COURSE_SLUG_PATTERN =
  /^[a-z0-9][a-z0-9._-]{0,199}$/;

const MAX_CONFIRMATION_SLUG_LENGTH =
  200;

const BATCH_WRITE_LIMIT =
  25;

const MAX_BATCH_WRITE_ATTEMPTS =
  6;

const S3_DELETE_LIMIT =
  1000;

const MAX_S3_DELETE_ATTEMPTS =
  6;

const MAX_S3_DRAIN_PAGES =
  1000;

type QueryIdsInput = {
  tableName: string;
  indexName: string;
  partitionKeyName: string;
  partitionKeyValue: string;
};

type LessonForDeletion = {
  id: string;
  videoPath: string | null;
  materialsPath: string | null;
};

type DeleteConfig = {
  courseTableName: string;
  moduleTableName: string;
  lessonTableName: string;
  lessonNoteTableName: string;
  lessonTaskTableName: string;
  moduleCourseIndexName: string;
  lessonModuleIndexName: string;
  lessonNoteLessonIndexName: string;
  lessonTaskLessonIndexName: string;
  storageBucketName: string;
};

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

function getDeleteConfig(): DeleteConfig {
  return {
    courseTableName:
      getRequiredEnvironmentVariable(
        "COURSE_TABLE_NAME",
      ),

    moduleTableName:
      getRequiredEnvironmentVariable(
        "MODULE_TABLE_NAME",
      ),

    lessonTableName:
      getRequiredEnvironmentVariable(
        "LESSON_TABLE_NAME",
      ),

    lessonNoteTableName:
      getRequiredEnvironmentVariable(
        "LESSON_NOTE_TABLE_NAME",
      ),

    lessonTaskTableName:
      getRequiredEnvironmentVariable(
        "LESSON_TASK_TABLE_NAME",
      ),

    moduleCourseIndexName:
      getRequiredEnvironmentVariable(
        "MODULE_COURSE_INDEX_NAME",
      ),

    lessonModuleIndexName:
      getRequiredEnvironmentVariable(
        "LESSON_MODULE_INDEX_NAME",
      ),

    lessonNoteLessonIndexName:
      getRequiredEnvironmentVariable(
        "LESSON_NOTE_LESSON_INDEX_NAME",
      ),

    lessonTaskLessonIndexName:
      getRequiredEnvironmentVariable(
        "LESSON_TASK_LESSON_INDEX_NAME",
      ),

    /*
     * Amplify Storage injects this variable automatically because
     * storage/resource.ts grants this function list/delete access.
     * No backend.ts bucket reference is needed, which prevents a
     * nested-stack circular dependency.
     */
    storageBucketName:
      env.COURSE_PLATFORM_FILES_BUCKET_NAME,
  };
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
    Array.isArray(
      directGroups,
    )
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
    Array.isArray(
      groupsClaim,
    )
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
    getIdentityGroups(
      identity,
    );

  if (
    !groups.includes(
      "ADMIN",
    )
  ) {
    throw new Error(
      "Unauthorized",
    );
  }
}

function normalizeCourseId(
  value: string,
): string {
  const normalizedValue =
    value.trim();

  if (
    !RESOURCE_ID_PATTERN.test(
      normalizedValue,
    )
  ) {
    throw new Error(
      "Nieprawidłowy identyfikator kursu.",
    );
  }

  return normalizedValue;
}

function normalizeConfirmationSlug(
  value: string,
): string {
  const normalizedValue =
    value.trim();

  if (
    !normalizedValue ||
    normalizedValue.length >
      MAX_CONFIRMATION_SLUG_LENGTH
  ) {
    throw new Error(
      "Nieprawidłowe potwierdzenie usunięcia kursu.",
    );
  }

  return normalizedValue;
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
  return item?.[fieldName]?.S ??
    null;
}

function getOptionalBoolean(
  item:
    | Record<
        string,
        AttributeValue
      >
    | undefined,
  fieldName: string,
): boolean | null {
  const value =
    item?.[fieldName];

  if (!value) {
    return null;
  }

  if (
    !("BOOL" in value) ||
    typeof value.BOOL !==
      "boolean"
  ) {
    throw new Error(
      `Invalid ${fieldName} value.`,
    );
  }

  return value.BOOL;
}

async function queryAllIds({
  tableName,
  indexName,
  partitionKeyName,
  partitionKeyValue,
}: QueryIdsInput): Promise<string[]> {
  const ids: string[] =
    [];

  let exclusiveStartKey:
    | Record<
        string,
        AttributeValue
      >
    | undefined;

  do {
    const result =
      await dynamoDb.send(
        new QueryCommand({
          TableName:
            tableName,

          IndexName:
            indexName,

          KeyConditionExpression:
            "#partitionKey = :partitionKey",

          ProjectionExpression:
            "#id",

          ExpressionAttributeNames: {
            "#partitionKey":
              partitionKeyName,

            "#id":
              "id",
          },

          ExpressionAttributeValues: {
            ":partitionKey": {
              S:
                partitionKeyValue,
            },
          },

          ExclusiveStartKey:
            exclusiveStartKey,
        }),
      );

    for (
      const item of
        result.Items ?? []
    ) {
      const id =
        item.id?.S;

      if (id) {
        ids.push(
          id,
        );
      }
    }

    exclusiveStartKey =
      result.LastEvaluatedKey;
  } while (
    exclusiveStartKey
  );

  return ids;
}

async function queryAllLessons(
  tableName: string,
  indexName: string,
  moduleId: string,
): Promise<LessonForDeletion[]> {
  const lessons:
    LessonForDeletion[] =
    [];

  let exclusiveStartKey:
    | Record<
        string,
        AttributeValue
      >
    | undefined;

  do {
    const result =
      await dynamoDb.send(
        new QueryCommand({
          TableName:
            tableName,

          IndexName:
            indexName,

          KeyConditionExpression:
            "#moduleId = :moduleId",

          ProjectionExpression:
            "#id, #videoPath, #materialsPath",

          ExpressionAttributeNames: {
            "#moduleId":
              "moduleId",

            "#id":
              "id",

            "#videoPath":
              "videoPath",

            "#materialsPath":
              "materialsPath",
          },

          ExpressionAttributeValues: {
            ":moduleId": {
              S:
                moduleId,
            },
          },

          ExclusiveStartKey:
            exclusiveStartKey,
        }),
      );

    for (
      const item of
        result.Items ?? []
    ) {
      const id =
        item.id?.S;

      if (!id) {
        throw new Error(
          "Lesson query returned an item without id.",
        );
      }

      lessons.push({
        id,
        videoPath:
          getOptionalString(
            item,
            "videoPath",
          ),
        materialsPath:
          getOptionalString(
            item,
            "materialsPath",
          ),
      });
    }

    exclusiveStartKey =
      result.LastEvaluatedKey;
  } while (
    exclusiveStartKey
  );

  return lessons;
}

function chunkArray<T>(
  values: T[],
  chunkSize: number,
): T[][] {
  const chunks: T[][] =
    [];

  for (
    let index = 0;
    index < values.length;
    index += chunkSize
  ) {
    chunks.push(
      values.slice(
        index,
        index + chunkSize,
      ),
    );
  }

  return chunks;
}

function sleep(
  milliseconds: number,
): Promise<void> {
  resolverBudget().require(milliseconds + 2_000);
  return new Promise(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

async function deleteIdsInBatches(
  tableName: string,
  ids: string[],
): Promise<void> {
  const uniqueIds =
    Array.from(
      new Set(
        ids,
      ),
    );

  const chunks =
    chunkArray(
      uniqueIds,
      BATCH_WRITE_LIMIT,
    );

  for (
    const chunk of chunks
  ) {
    let pendingRequests:
      WriteRequest[] =
      chunk.map(
        (id) => ({
          DeleteRequest: {
            Key: {
              id: {
                S:
                  id,
              },
            },
          },
        }),
      );

    for (
      let attempt = 0;
      pendingRequests.length >
        0 &&
      attempt <
        MAX_BATCH_WRITE_ATTEMPTS;
      attempt += 1
    ) {
      const result =
        await dynamoDb.send(
          new BatchWriteItemCommand({
            RequestItems: {
              [tableName]:
                pendingRequests,
            },
          }),
        );

      pendingRequests =
        result
          .UnprocessedItems?.[
            tableName
          ] ?? [];

      if (
        pendingRequests.length >
        0
      ) {
        await sleep(
          50 *
            2 ** attempt,
        );
      }
    }

    if (
      pendingRequests.length >
      0
    ) {
      throw new Error(
        "DynamoDB did not process all delete requests.",
      );
    }
  }
}

function assertSafeStoredAssetPath(
  path: string,
  courseId: string,
  courseSlug: string,
): string {
  const normalizedPath =
    path.trim();

  if (
    !normalizedPath ||
    normalizedPath.startsWith(
      "/",
    ) ||
    normalizedPath.includes(
      "\\",
    ) ||
    normalizedPath.includes(
      "..",
    )
  ) {
    throw new Error(
      "Unsafe lesson asset path detected.",
    );
  }

  const currentPrefix =
    `courses/${courseId}/lessons/`;

  if (
    normalizedPath.startsWith(
      currentPrefix,
    )
  ) {
    return normalizedPath;
  }

  if (
    COURSE_SLUG_PATTERN.test(
      courseSlug,
    ) &&
    normalizedPath.startsWith(
      `courses/${courseSlug}/`,
    )
  ) {
    return normalizedPath;
  }

  throw new Error(
    "Lesson asset path does not belong to the course being deleted.",
  );
}

async function deleteS3Keys(
  bucketName: string,
  keys: string[],
): Promise<void> {
  const uniqueKeys =
    Array.from(
      new Set(
        keys,
      ),
    );

  for (
    const chunk of
      chunkArray(
        uniqueKeys,
        S3_DELETE_LIMIT,
      )
  ) {
    let pendingKeys =
      chunk;

    for (
      let attempt = 0;
      pendingKeys.length > 0 &&
      attempt <
        MAX_S3_DELETE_ATTEMPTS;
      attempt += 1
    ) {
      const result =
        await s3.send(
          new DeleteObjectsCommand({
            Bucket:
              bucketName,

            Delete: {
              Objects:
                pendingKeys.map(
                  (key) => ({
                    Key:
                      key,
                  }),
                ),

              Quiet:
                true,
            },
          }),
        );

      const failedKeys =
        (result.Errors ?? [])
          .map((error) =>
            error.Key,
          )
          .filter(
            (
              key,
            ): key is string =>
              typeof key ===
                "string" &&
              key.length > 0,
          );

      pendingKeys =
        Array.from(
          new Set(
            failedKeys,
          ),
        );

      if (
        pendingKeys.length > 0
      ) {
        await sleep(
          50 *
            2 ** attempt,
        );
      }
    }

    if (
      pendingKeys.length > 0
    ) {
      throw new Error(
        "S3 did not delete all requested objects.",
      );
    }
  }
}

async function drainS3Prefix(
  bucketName: string,
  prefix: string,
): Promise<void> {
  for (
    let page = 0;
    page < MAX_S3_DRAIN_PAGES;
    page += 1
  ) {
    const result =
      await s3.send(
        new ListObjectsV2Command({
          Bucket:
            bucketName,

          Prefix:
            prefix,

          MaxKeys:
            S3_DELETE_LIMIT,
        }),
      );

    const keys =
      (result.Contents ?? [])
        .map((item) =>
          item.Key,
        )
        .filter(
          (
            key,
          ): key is string =>
            typeof key ===
              "string" &&
            key.length > 0,
        );

    if (
      keys.length === 0
    ) {
      return;
    }

    await deleteS3Keys(
      bucketName,
      keys,
    );
  }

  throw new Error(
    "S3 cleanup exceeded the maximum number of pages.",
  );
}

async function cleanupCourseStorage(
  bucketName: string,
  courseId: string,
  referencedAssetKeys: string[],
): Promise<void> {
  /*
   * Exact stored paths remove currently referenced legacy assets.
   * This is intentionally done after the database cascade so an S3
   * failure cannot leave surviving Lesson records pointing at files
   * that were already removed.
   */
  await deleteS3Keys(
    bucketName,
    referencedAssetKeys,
  );

  /*
   * ID-based prefixes are retry-safe even after Course has already
   * disappeared from DynamoDB. They also collect historical orphan
   * files created by failed replacement cleanup.
   */
  await drainS3Prefix(
    bucketName,
    `courses/${courseId}/`,
  );

  await drainS3Prefix(
    bucketName,
    `course-thumbnails/${courseId}/`,
  );
}

export const handler: Schema["deleteAdminCourse"]["functionHandler"] =
  async (event) => withResolverBudget(24_000, async () => {
    try {
      assertAdmin(
        event.identity,
      );

      const courseId =
        normalizeCourseId(
          event.arguments
            .courseId,
        );

      const confirmationSlug =
        normalizeConfirmationSlug(
          event.arguments
            .confirmationSlug,
        );

      const config =
        getDeleteConfig();

      const courseResult =
        await dynamoDb.send(
          new GetItemCommand({
            TableName:
              config
                .courseTableName,

            Key: {
              id: {
                S:
                  courseId,
              },
            },

            ConsistentRead:
              true,

            ProjectionExpression:
              "#slug, #published",

            ExpressionAttributeNames: {
              "#slug":
                "slug",

              "#published":
                "published",
            },
          }),
        );

      if (
        !courseResult.Item
      ) {
        /*
         * Retry path: DynamoDB may already be clean while a previous
         * invocation failed during S3 cleanup. ID-based prefixes can
         * still be cleaned safely without the Course record.
         */
        await cleanupCourseStorage(
          config.storageBucketName,
          courseId,
          [],
        );

        return {
          status:
            "ALREADY_DELETED",

          deletedModules:
            0,

          deletedLessons:
            0,

          deletedNotes:
            0,

          deletedTasks:
            0,
        };
      }

      const storedSlug =
        getRequiredString(
          courseResult.Item,
          "slug",
        );

      if (
        confirmationSlug !==
        storedSlug
      ) {
        throw new Error(
          "Wpisany slug nie zgadza się z usuwanym kursem.",
        );
      }

      const published =
        getOptionalBoolean(
          courseResult.Item,
          "published",
        ) ?? false;

      if (published) {
        throw new Error(
          "Najpierw wycofaj kurs z publikacji, a dopiero potem go usuń.",
        );
      }

      const moduleIds =
        await queryAllIds({
          tableName:
            config
              .moduleTableName,

          indexName:
            config
              .moduleCourseIndexName,

          partitionKeyName:
            "courseId",

          partitionKeyValue:
            courseId,
        });

      const lessons:
        LessonForDeletion[] =
        [];

      for (
        const moduleId of
          moduleIds
      ) {
        lessons.push(
          ...(
            await queryAllLessons(
              config
                .lessonTableName,
              config
                .lessonModuleIndexName,
              moduleId,
            )
          ),
        );
      }

      const lessonIds =
        lessons.map(
          (lesson) =>
            lesson.id,
        );

      const referencedAssetKeys =
        lessons
          .flatMap(
            (lesson) => [
              lesson.videoPath,
              lesson.materialsPath,
            ],
          )
          .filter(
            (
              path,
            ): path is string =>
              typeof path ===
                "string" &&
              path.length > 0,
          )
          .map((path) =>
            assertSafeStoredAssetPath(
              path,
              courseId,
              storedSlug,
            ),
          );

      const noteIds:
        string[] =
        [];

      const taskIds:
        string[] =
        [];

      for (
        const lessonId of
          lessonIds
      ) {
        const [
          lessonNoteIds,
          lessonTaskIds,
        ] =
          await Promise.all([
            queryAllIds({
              tableName:
                config
                  .lessonNoteTableName,

              indexName:
                config
                  .lessonNoteLessonIndexName,

              partitionKeyName:
                "lessonId",

              partitionKeyValue:
                lessonId,
            }),

            queryAllIds({
              tableName:
                config
                  .lessonTaskTableName,

              indexName:
                config
                  .lessonTaskLessonIndexName,

              partitionKeyName:
                "lessonId",

              partitionKeyValue:
                lessonId,
            }),
          ]);

        noteIds.push(
          ...lessonNoteIds,
        );

        taskIds.push(
          ...lessonTaskIds,
        );
      }

      await deleteIdsInBatches(
        config
          .lessonNoteTableName,
        noteIds,
      );

      await deleteIdsInBatches(
        config
          .lessonTaskTableName,
        taskIds,
      );

      await deleteIdsInBatches(
        config
          .lessonTableName,
        lessonIds,
      );

      await deleteIdsInBatches(
        config
          .moduleTableName,
        moduleIds,
      );

      await dynamoDb.send(
        new DeleteItemCommand({
          TableName:
            config
              .courseTableName,

          Key: {
            id: {
              S:
                courseId,
            },
          },
        }),
      );

      await cleanupCourseStorage(
        config.storageBucketName,
        courseId,
        referencedAssetKeys,
      );

      return {
        status:
          "DELETED",

        deletedModules:
          moduleIds.length,

        deletedLessons:
          lessonIds.length,

        deletedNotes:
          noteIds.length,

        deletedTasks:
          taskIds.length,
      };
    } catch (error) {
      console.error(
        "delete-admin-course failed",
        {
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },
      );

      throw error;
    }
  });
