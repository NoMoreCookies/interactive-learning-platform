import {
  DynamoDBClient,
  GetItemCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";

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

function getRequiredBoolean(
  item: DynamoDbItem,
  fieldName: string,
): boolean {
  const value = item[fieldName];

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
      (group): group is string =>
        typeof group === "string",
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

  const claimGroups =
    (
      claims as Record<
        string,
        unknown
      >
    )["cognito:groups"];

  if (
    Array.isArray(claimGroups)
  ) {
    return claimGroups.filter(
      (group): group is string =>
        typeof group === "string",
    );
  }

  if (
    typeof claimGroups === "string"
  ) {
    return [claimGroups];
  }

  return [];
}

function isAdminIdentity(
  identity: unknown,
): boolean {
  return getIdentityGroups(
    identity,
  ).includes("ADMIN");
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
        TableName: tableName,

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
  Schema["getTaskSolution"]["functionHandler"] =
  async (event) => {
    /*
     * Defense in depth.
     *
     * AppSync performs the first ADMIN check.
     * Lambda independently verifies the identity again.
     */
    if (
      !isAdminIdentity(
        event.identity,
      )
    ) {
      console.warn(
        "Task solution request rejected for non-admin identity.",
      );

      throw new Error(
        "Brak uprawnień do rozwiązania.",
      );
    }

    const courseTableName =
      process.env.COURSE_TABLE_NAME;

    const moduleTableName =
      process.env.MODULE_TABLE_NAME;

    const lessonTableName =
      process.env.LESSON_TABLE_NAME;

    const lessonTaskTableName =
      process.env
        .LESSON_TASK_TABLE_NAME;

    if (
      !courseTableName ||
      !moduleTableName ||
      !lessonTableName ||
      !lessonTaskTableName
    ) {
      console.error(
        "Task solution table configuration is incomplete.",
      );

      throw new Error(
        "Nie udało się pobrać rozwiązania.",
      );
    }

    const taskId =
      event.arguments.taskId.trim();

    if (!taskId) {
      return null;
    }

    try {
      /*
       * Read only:
       *
       * - id
       * - lessonId
       * - solution
       *
       * answer is deliberately NOT read.
       */
      const taskItem =
        await getItemById(
          lessonTaskTableName,
          taskId,

          [
            "#id",
            "#lessonId",
            "#solution",
          ].join(", "),

          {
            "#id": "id",
            "#lessonId":
              "lessonId",
            "#solution":
              "solution",
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
       * Verify Lesson publication state.
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
       * Verify Module publication state.
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
       * Verify Course publication state.
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

      return {
        taskId:
          getRequiredString(
            taskItem,
            "id",
          ),

        solution:
          getOptionalString(
            taskItem,
            "solution",
          ),
      };
    } catch (error) {
      console.error(
        "Failed to load task solution.",
        {
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },
      );

      throw new Error(
        "Nie udało się pobrać rozwiązania.",
      );
    }
  };