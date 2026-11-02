import { boundedAwsOptions, budgetedClient, withResolverBudget } from "../../shared/resolver-budget";
import {
  DynamoDBClient,
  ScanCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";

import type { Schema } from "../resource";

const dynamoDb = budgetedClient(new DynamoDBClient(boundedAwsOptions));

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
      `Invalid Course.${fieldName} value.`,
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
      `Invalid Course.${fieldName} value.`,
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
      `Invalid Course.${fieldName} value.`,
    );
  }

  const parsedValue =
    Number(value.N);

  if (
    !Number.isSafeInteger(parsedValue)
  ) {
    throw new Error(
      `Invalid Course.${fieldName} value.`,
    );
  }

  return parsedValue;
}

export const handler: Schema["listPublishedCourses"]["functionHandler"] =
  async () => withResolverBudget(8_000, async () => {
    const tableName =
      process.env.COURSE_TABLE_NAME;

    if (!tableName) {
      console.error(
        "Course table name is not configured.",
      );

      throw new Error(
        "Nie udało się pobrać katalogu kursów.",
      );
    }

    try {
      const courses = [];

      let exclusiveStartKey:
        | Record<
            string,
            AttributeValue
          >
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
                ":published": {
                  BOOL: true,
                },
              },
            }),
          );

        for (
          const item of
          result.Items ?? []
        ) {
          courses.push({
            id: getRequiredString(
              item,
              "id",
            ),

            title: getRequiredString(
              item,
              "title",
            ),

            slug: getRequiredString(
              item,
              "slug",
            ),

            description:
              getOptionalString(
                item,
                "description",
              ),

            subject:
              getOptionalString(
                item,
                "subject",
              ),

            level:
              getOptionalString(
                item,
                "level",
              ),

            thumbnailPath:
              getOptionalString(
                item,
                "thumbnailPath",
              ),

            order:
              getRequiredInteger(
                item,
                "order",
              ),
          });
        }

        exclusiveStartKey =
          result.LastEvaluatedKey;
      } while (exclusiveStartKey);

      return courses.sort(
        (firstCourse, secondCourse) =>
          firstCourse.order -
            secondCourse.order ||
          firstCourse.title.localeCompare(
            secondCourse.title,
          ),
      );
    } catch (error) {
      console.error(
        "Failed to load public course catalog.",
        {
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },
      );

      throw new Error(
        "Nie udało się pobrać katalogu kursów.",
      );
    }
  });
