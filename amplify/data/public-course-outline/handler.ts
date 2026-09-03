import {
  DynamoDBClient,
  ScanCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";

import type { Schema } from "../resource";

const dynamoDb =
  new DynamoDBClient({});

type DynamoDbItem =
  Record<string, AttributeValue>;

function getRequiredString(
  item: DynamoDbItem,
  fieldName: string,
): string {
  const value = item[fieldName];

  if (
    !value ||
    !("S" in value) ||
    typeof value.S !== "string"
  ) {
    throw new Error(
      `Invalid ${fieldName} value.`,
    );
  }

  return value.S;
}

function getOptionalString(
  item: DynamoDbItem,
  fieldName: string,
): string | null {
  const value = item[fieldName];

  if (!value) {
    return null;
  }

  if (
    !("S" in value) ||
    typeof value.S !== "string"
  ) {
    throw new Error(
      `Invalid ${fieldName} value.`,
    );
  }

  return value.S;
}

function getRequiredInteger(
  item: DynamoDbItem,
  fieldName: string,
): number {
  const value = item[fieldName];

  if (
    !value ||
    !("N" in value) ||
    typeof value.N !== "string"
  ) {
    throw new Error(
      `Invalid ${fieldName} value.`,
    );
  }

  const parsedValue =
    Number(value.N);

  if (
    !Number.isSafeInteger(parsedValue)
  ) {
    throw new Error(
      `Invalid ${fieldName} value.`,
    );
  }

  return parsedValue;
}

function getOptionalInteger(
  item: DynamoDbItem,
  fieldName: string,
): number | null {
  const value = item[fieldName];

  if (!value) {
    return null;
  }

  if (
    !("N" in value) ||
    typeof value.N !== "string"
  ) {
    throw new Error(
      `Invalid ${fieldName} value.`,
    );
  }

  const parsedValue =
    Number(value.N);

  if (
    !Number.isSafeInteger(parsedValue)
  ) {
    throw new Error(
      `Invalid ${fieldName} value.`,
    );
  }

  return parsedValue;
}

async function scanPublishedCourseBySlug(
  tableName: string,
  slug: string,
): Promise<DynamoDbItem[]> {
  const items: DynamoDbItem[] = [];

  let exclusiveStartKey:
    | Record<string, AttributeValue>
    | undefined;

  do {
    const result =
      await dynamoDb.send(
        new ScanCommand({
          TableName: tableName,

          ExclusiveStartKey:
            exclusiveStartKey,

          FilterExpression:
            "#slug = :slug AND #published = :published",

          ProjectionExpression: [
            "#id",
            "#title",
            "#slug",
            "#description",
            "#subject",
            "#level",
            "#thumbnailPath",
            "#order",
          ].join(", "),

          ExpressionAttributeNames: {
            "#id": "id",
            "#title": "title",
            "#slug": "slug",
            "#description":
              "description",
            "#subject": "subject",
            "#level": "level",
            "#thumbnailPath":
              "thumbnailPath",
            "#order": "order",
            "#published":
              "published",
          },

          ExpressionAttributeValues: {
            ":slug": {
              S: slug,
            },

            ":published": {
              BOOL: true,
            },
          },
        }),
      );

    items.push(
      ...(result.Items ?? []),
    );

    exclusiveStartKey =
      result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

async function scanPublishedModules(
  tableName: string,
  courseId: string,
): Promise<DynamoDbItem[]> {
  const items: DynamoDbItem[] = [];

  let exclusiveStartKey:
    | Record<string, AttributeValue>
    | undefined;

  do {
    const result =
      await dynamoDb.send(
        new ScanCommand({
          TableName: tableName,

          ExclusiveStartKey:
            exclusiveStartKey,

          FilterExpression:
            "#courseId = :courseId AND #published = :published",

          ProjectionExpression: [
            "#id",
            "#courseId",
            "#title",
            "#slug",
            "#description",
            "#order",
          ].join(", "),

          ExpressionAttributeNames: {
            "#id": "id",
            "#courseId": "courseId",
            "#title": "title",
            "#slug": "slug",
            "#description":
              "description",
            "#order": "order",
            "#published":
              "published",
          },

          ExpressionAttributeValues: {
            ":courseId": {
              S: courseId,
            },

            ":published": {
              BOOL: true,
            },
          },
        }),
      );

    items.push(
      ...(result.Items ?? []),
    );

    exclusiveStartKey =
      result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

async function scanPublishedLessons(
  tableName: string,
): Promise<DynamoDbItem[]> {
  const items: DynamoDbItem[] = [];

  let exclusiveStartKey:
    | Record<string, AttributeValue>
    | undefined;

  do {
    const result =
      await dynamoDb.send(
        new ScanCommand({
          TableName: tableName,

          ExclusiveStartKey:
            exclusiveStartKey,

          FilterExpression:
            "#published = :published",

          ProjectionExpression: [
            "#id",
            "#moduleId",
            "#title",
            "#slug",
            "#description",
            "#durationMinutes",
            "#order",
          ].join(", "),

          ExpressionAttributeNames: {
            "#id": "id",
            "#moduleId": "moduleId",
            "#title": "title",
            "#slug": "slug",
            "#description":
              "description",
            "#durationMinutes":
              "durationMinutes",
            "#order": "order",
            "#published":
              "published",
          },

          ExpressionAttributeValues: {
            ":published": {
              BOOL: true,
            },
          },
        }),
      );

    items.push(
      ...(result.Items ?? []),
    );

    exclusiveStartKey =
      result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

export const handler: Schema["getPublishedCourseOutline"]["functionHandler"] =
  async (event) => {
    const courseTableName =
      process.env.COURSE_TABLE_NAME;

    const moduleTableName =
      process.env.MODULE_TABLE_NAME;

    const lessonTableName =
      process.env.LESSON_TABLE_NAME;

    if (
      !courseTableName ||
      !moduleTableName ||
      !lessonTableName
    ) {
      console.error(
        "Public course outline table configuration is incomplete.",
      );

      throw new Error(
        "Nie udało się pobrać struktury kursu.",
      );
    }

    const normalizedSlug =
      event.arguments.slug.trim();

    if (!normalizedSlug) {
      return null;
    }

    try {
      /*
       * The caller cannot control publication state.
       * Only published courses are considered.
       */
      const courseItems =
        await scanPublishedCourseBySlug(
          courseTableName,
          normalizedSlug,
        );

      if (courseItems.length === 0) {
        return null;
      }

      /*
       * Slugs are not currently enforced as unique by DynamoDB.
       * Returning an arbitrary course would make routing ambiguous,
       * so fail closed if duplicate published slugs exist.
       */
      if (courseItems.length > 1) {
        console.error(
          "Multiple published courses use the same slug.",
        );

        throw new Error(
          "Nie udało się jednoznacznie ustalić kursu.",
        );
      }

      const courseItem =
        courseItems[0];

      const courseId =
        getRequiredString(
          courseItem,
          "id",
        );

      /*
       * Only modules belonging to the selected published course
       * and marked as published are returned.
       */
      const moduleItems =
        await scanPublishedModules(
          moduleTableName,
          courseId,
        );

      moduleItems.sort(
        (firstModule, secondModule) =>
          getRequiredInteger(
            firstModule,
            "order",
          ) -
          getRequiredInteger(
            secondModule,
            "order",
          ),
      );

      if (moduleItems.length === 0) {
        return {
          id: courseId,

          title:
            getRequiredString(
              courseItem,
              "title",
            ),

          slug:
            getRequiredString(
              courseItem,
              "slug",
            ),

          description:
            getOptionalString(
              courseItem,
              "description",
            ),

          subject:
            getOptionalString(
              courseItem,
              "subject",
            ),

          level:
            getOptionalString(
              courseItem,
              "level",
            ),

          thumbnailPath:
            getOptionalString(
              courseItem,
              "thumbnailPath",
            ),

          order:
            getRequiredInteger(
              courseItem,
              "order",
            ),

          modules: [],
        };
      }

      /*
       * We scan published lessons once and then restrict them
       * to modules that already passed the publication check.
       *
       * This avoids an N+1 pattern where every module would trigger
       * another DynamoDB Scan.
       */
      const lessonItems =
        await scanPublishedLessons(
          lessonTableName,
        );

      const publicModuleIds =
        new Set(
          moduleItems.map((moduleItem) =>
            getRequiredString(
              moduleItem,
              "id",
            ),
          ),
        );

      const lessonsByModuleId =
        new Map<
          string,
          DynamoDbItem[]
        >();

      for (
        const lessonItem of
        lessonItems
      ) {
        const moduleId =
          getRequiredString(
            lessonItem,
            "moduleId",
          );

        /*
         * This enforces the publication hierarchy:
         *
         * Course published
         * AND Module published
         * AND Lesson published.
         */
        if (
          !publicModuleIds.has(
            moduleId,
          )
        ) {
          continue;
        }

        const currentLessons =
          lessonsByModuleId.get(
            moduleId,
          ) ?? [];

        currentLessons.push(
          lessonItem,
        );

        lessonsByModuleId.set(
          moduleId,
          currentLessons,
        );
      }

      const modules =
        moduleItems.map(
          (moduleItem) => {
            const moduleId =
              getRequiredString(
                moduleItem,
                "id",
              );

            const moduleLessons =
              lessonsByModuleId.get(
                moduleId,
              ) ?? [];

            moduleLessons.sort(
              (
                firstLesson,
                secondLesson,
              ) =>
                getRequiredInteger(
                  firstLesson,
                  "order",
                ) -
                getRequiredInteger(
                  secondLesson,
                  "order",
                ),
            );

            return {
              id: moduleId,

              title:
                getRequiredString(
                  moduleItem,
                  "title",
                ),

              slug:
                getRequiredString(
                  moduleItem,
                  "slug",
                ),

              description:
                getOptionalString(
                  moduleItem,
                  "description",
                ),

              order:
                getRequiredInteger(
                  moduleItem,
                  "order",
                ),

              lessons:
                moduleLessons.map(
                  (lessonItem) => ({
                    id:
                      getRequiredString(
                        lessonItem,
                        "id",
                      ),

                    title:
                      getRequiredString(
                        lessonItem,
                        "title",
                      ),

                    slug:
                      getRequiredString(
                        lessonItem,
                        "slug",
                      ),

                    description:
                      getOptionalString(
                        lessonItem,
                        "description",
                      ),

                    durationMinutes:
                      getOptionalInteger(
                        lessonItem,
                        "durationMinutes",
                      ),

                    order:
                      getRequiredInteger(
                        lessonItem,
                        "order",
                      ),
                  }),
                ),
            };
          },
        );

      return {
        id: courseId,

        title:
          getRequiredString(
            courseItem,
            "title",
          ),

        slug:
          getRequiredString(
            courseItem,
            "slug",
          ),

        description:
          getOptionalString(
            courseItem,
            "description",
          ),

        subject:
          getOptionalString(
            courseItem,
            "subject",
          ),

        level:
          getOptionalString(
            courseItem,
            "level",
          ),

        thumbnailPath:
          getOptionalString(
            courseItem,
            "thumbnailPath",
          ),

        order:
          getRequiredInteger(
            courseItem,
            "order",
          ),

        modules,
      };
    } catch (error) {
      console.error(
        "Failed to load public course outline.",
        {
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },
      );

      throw new Error(
        "Nie udało się pobrać struktury kursu.",
      );
    }
  };