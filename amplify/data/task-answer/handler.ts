import {
  DynamoDBClient,
  GetItemCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";

import {
  hasPremiumAccess,
} from "../../shared/premium-access";

import type {
  Schema,
} from "../resource";

const dynamoDb =
  new DynamoDBClient({});

type DynamoDbItem =
  Record<string, AttributeValue>;

function getRequiredString(
  item: DynamoDbItem,
  fieldName: string,
): string {
  const value =
    item[fieldName];

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
  const value =
    item[fieldName];

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

function getRequiredBoolean(
  item: DynamoDbItem,
  fieldName: string,
): boolean {
  const value =
    item[fieldName];

  if (
    !value ||
    !("BOOL" in value) ||
    typeof value.BOOL !== "boolean"
  ) {
    throw new Error(
      `Invalid ${fieldName} value.`,
    );
  }

  return value.BOOL;
}

async function getItemById(
  tableName: string,
  id: string,
  projectionExpression: string,
  expressionAttributeNames:
    Record<string, string>,
): Promise<DynamoDbItem | null> {
  const result =
    await dynamoDb.send(
      new GetItemCommand({
        TableName:
          tableName,

        Key: {
          id: {
            S: id,
          },
        },

        ProjectionExpression:
          projectionExpression,

        ExpressionAttributeNames:
          expressionAttributeNames,
      }),
    );

  return result.Item ?? null;
}

export const handler:
  Schema["getTaskAnswer"]["functionHandler"] =
  async (event) => {
    const courseTableName =
      process.env
        .COURSE_TABLE_NAME;

    const moduleTableName =
      process.env
        .MODULE_TABLE_NAME;

    const lessonTableName =
      process.env
        .LESSON_TABLE_NAME;

    const lessonTaskTableName =
      process.env
        .LESSON_TASK_TABLE_NAME;

    const entitlementTableName =
      process.env
        .ENTITLEMENT_TABLE_NAME;

    if (
      !courseTableName ||
      !moduleTableName ||
      !lessonTableName ||
      !lessonTaskTableName ||
      !entitlementTableName
    ) {
      console.error(
        "Task answer table configuration is incomplete.",
      );

      throw new Error(
        "Nie udało się pobrać odpowiedzi.",
      );
    }

    /*
     * Authorization boundary:
     *
     * 1. AppSync requires an authenticated Cognito user.
     * 2. Lambda independently requires either:
     *    - ADMIN membership, or
     *    - an active PREMIUM entitlement.
     *
     * The userId used for entitlement lookup comes from the
     * authenticated AppSync identity, never from browser input.
     */
    let premiumAccessAllowed:
      boolean;

    try {
      premiumAccessAllowed =
        await hasPremiumAccess({
          identity:
            event.identity,

          entitlementTableName,
        });
    } catch (error) {
      console.error(
        "Task answer authorization check failed.",
        {
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },
      );

      throw new Error(
        "Nie udało się zweryfikować dostępu.",
      );
    }

    if (
      !premiumAccessAllowed
    ) {
      console.warn(
        "Task answer request rejected.",
      );

      throw new Error(
        "Brak uprawnień do odpowiedzi.",
      );
    }

    const taskId =
      event.arguments
        .taskId
        .trim();

    if (!taskId) {
      return null;
    }

    try {
      /*
       * Read only what this endpoint requires:
       *
       * - id
       * - lessonId
       * - answer
       *
       * solution is deliberately not read.
       */
      const taskItem =
        await getItemById(
          lessonTaskTableName,
          taskId,

          [
            "#id",
            "#lessonId",
            "#answer",
          ].join(", "),

          {
            "#id":
              "id",

            "#lessonId":
              "lessonId",

            "#answer":
              "answer",
          },
        );

      if (!taskItem) {
        return null;
      }

      const lessonId =
        getRequiredString(
          taskItem,
          "lessonId",
        );

      /*
       * Premium access never grants access to content belonging
       * to an unpublished Lesson.
       */
      const lessonItem =
        await getItemById(
          lessonTableName,
          lessonId,

          [
            "#moduleId",
            "#published",
          ].join(", "),

          {
            "#moduleId":
              "moduleId",

            "#published":
              "published",
          },
        );

      if (!lessonItem) {
        return null;
      }

      if (
        !getRequiredBoolean(
          lessonItem,
          "published",
        )
      ) {
        return null;
      }

      const moduleId =
        getRequiredString(
          lessonItem,
          "moduleId",
        );

      /*
       * Verify parent Module publication.
       */
      const moduleItem =
        await getItemById(
          moduleTableName,
          moduleId,

          [
            "#courseId",
            "#published",
          ].join(", "),

          {
            "#courseId":
              "courseId",

            "#published":
              "published",
          },
        );

      if (!moduleItem) {
        return null;
      }

      if (
        !getRequiredBoolean(
          moduleItem,
          "published",
        )
      ) {
        return null;
      }

      const courseId =
        getRequiredString(
          moduleItem,
          "courseId",
        );

      /*
       * Verify parent Course publication.
       */
      const courseItem =
        await getItemById(
          courseTableName,
          courseId,

          "#published",

          {
            "#published":
              "published",
          },
        );

      if (!courseItem) {
        return null;
      }

      if (
        !getRequiredBoolean(
          courseItem,
          "published",
        )
      ) {
        return null;
      }

      /*
       * Only after authorization and the complete publication
       * hierarchy have passed may the answer leave the backend.
       */
      return {
        taskId:
          getRequiredString(
            taskItem,
            "id",
          ),

        answer:
          getOptionalString(
            taskItem,
            "answer",
          ),
      };
    } catch (error) {
      console.error(
        "Failed to load task answer.",
        {
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },
      );

      throw new Error(
        "Nie udało się pobrać odpowiedzi.",
      );
    }
  };