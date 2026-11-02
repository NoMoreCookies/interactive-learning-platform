import { boundedAwsOptions, budgetedClient, withResolverBudget } from "../../shared/resolver-budget";
import {
  DynamoDBClient,
  GetItemCommand,
  ScanCommand,
  type AttributeValue,
  type ScanCommandInput,
} from "@aws-sdk/client-dynamodb";

import {
  hasPremiumAccess,
} from "../../shared/premium-access";

import type {
  Schema,
} from "../resource";

const dynamoDb =
  budgetedClient(new DynamoDBClient(boundedAwsOptions));

type DynamoDbItem =
  Record<string, AttributeValue>;

type PremiumNote = {
  id: string;
  title: string;
  content: string;
  order: number;
};

type PremiumTask = {
  id: string;
  title: string;
  content: string;
  order: number;
};

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

function getRequiredInteger(
  item: DynamoDbItem,
  fieldName: string,
): number {
  const value =
    item[fieldName];

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
    !Number.isSafeInteger(
      parsedValue,
    )
  ) {
    throw new Error(
      `Invalid ${fieldName} value.`,
    );
  }

  return parsedValue;
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

async function scanAll(
  input: Omit<
    ScanCommandInput,
    "ExclusiveStartKey"
  >,
): Promise<DynamoDbItem[]> {
  const items:
    DynamoDbItem[] = [];

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
          ...input,

          ExclusiveStartKey:
            exclusiveStartKey,
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

async function scanLessonNotes(
  tableName: string,
  lessonId: string,
): Promise<DynamoDbItem[]> {
  return scanAll({
    TableName: tableName,

    FilterExpression:
      "#lessonId = :lessonId",

    ProjectionExpression: [
      "#id",
      "#title",
      "#content",
      "#order",
    ].join(", "),

    ExpressionAttributeNames: {
      "#id": "id",
      "#lessonId": "lessonId",
      "#title": "title",
      "#content": "content",
      "#order": "order",
    },

    ExpressionAttributeValues: {
      ":lessonId": {
        S: lessonId,
      },
    },
  });
}

async function scanLessonTasks(
  tableName: string,
  lessonId: string,
): Promise<DynamoDbItem[]> {
  return scanAll({
    TableName: tableName,

    FilterExpression:
      "#lessonId = :lessonId",

    /*
     * answer and solution are deliberately not read here.
     */
    ProjectionExpression: [
      "#id",
      "#title",
      "#content",
      "#order",
    ].join(", "),

    ExpressionAttributeNames: {
      "#id": "id",
      "#lessonId": "lessonId",
      "#title": "title",
      "#content": "content",
      "#order": "order",
    },

    ExpressionAttributeValues: {
      ":lessonId": {
        S: lessonId,
      },
    },
  });
}

function mapPremiumNote(
  item: DynamoDbItem,
): PremiumNote {
  return {
    id:
      getRequiredString(
        item,
        "id",
      ),

    title:
      getRequiredString(
        item,
        "title",
      ),

    content:
      getRequiredString(
        item,
        "content",
      ),

    order:
      getRequiredInteger(
        item,
        "order",
      ),
  };
}

function mapPremiumTask(
  item: DynamoDbItem,
): PremiumTask {
  return {
    id:
      getRequiredString(
        item,
        "id",
      ),

    title:
      getRequiredString(
        item,
        "title",
      ),

    content:
      getRequiredString(
        item,
        "content",
      ),

    order:
      getRequiredInteger(
        item,
        "order",
      ),
  };
}

function sortByOrderAndTitle<
  T extends {
    order: number;
    title: string;
  },
>(
  first: T,
  second: T,
): number {
  const orderDifference =
    first.order -
    second.order;

  if (orderDifference !== 0) {
    return orderDifference;
  }

  return first.title.localeCompare(
    second.title,
  );
}

export const handler:
  Schema["getPremiumLessonContent"]["functionHandler"] =
  async (event) => withResolverBudget(12_000, async () => {
    const courseTableName =
      process.env.COURSE_TABLE_NAME;

    const moduleTableName =
      process.env.MODULE_TABLE_NAME;

    const lessonTableName =
      process.env.LESSON_TABLE_NAME;

    const lessonNoteTableName =
      process.env
        .LESSON_NOTE_TABLE_NAME;

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
      !lessonNoteTableName ||
      !lessonTaskTableName ||
      !entitlementTableName
    ) {
      console.error(
        "Premium lesson content table configuration is incomplete.",
      );

      throw new Error(
        "Nie udało się pobrać treści lekcji.",
      );
    }

    /*
     * Authorization has two layers:
     *
     * 1. AppSync requires an authenticated Cognito user.
     * 2. This Lambda verifies ADMIN membership or a current
     *    PREMIUM entitlement.
     *
     * The userId used for the entitlement lookup comes from the
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
        "Premium lesson content authorization check failed.",
        {
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },
      );

      throw new Error(
        "Nie udało się zweryfikować dostępu do treści premium.",
      );
    }

    if (
      !premiumAccessAllowed
    ) {
      console.warn(
        "Premium lesson content request rejected.",
      );

      throw new Error(
        "Brak uprawnień do treści premium.",
      );
    }

    const lessonId =
      event.arguments.lessonId.trim();

    if (!lessonId) {
      return null;
    }

    try {
      /*
       * videoPath and materialsPath are read internally only to
       * determine whether corresponding assets exist.
       *
       * Their actual values are never returned to the browser.
       */
      const lessonItem =
        await getItemById(
          lessonTableName,
          lessonId,

          [
            "#id",
            "#moduleId",
            "#videoPath",
            "#materialsPath",
            "#published",
          ].join(", "),

          {
            "#id": "id",
            "#moduleId":
              "moduleId",
            "#videoPath":
              "videoPath",
            "#materialsPath":
              "materialsPath",
            "#published":
              "published",
          },
        );

      if (!lessonItem) {
        return null;
      }

      /*
       * A premium entitlement never grants access to drafts.
       */
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

      const videoPath =
        getOptionalString(
          lessonItem,
          "videoPath",
        );

      const materialsPath =
        getOptionalString(
          lessonItem,
          "materialsPath",
        );

      /*
       * Verify parent Module publication.
       */
      const moduleItem =
        await getItemById(
          moduleTableName,
          moduleId,

          [
            "#id",
            "#courseId",
            "#published",
          ].join(", "),

          {
            "#id": "id",
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

          [
            "#id",
            "#published",
          ].join(", "),

          {
            "#id": "id",
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
       * Only after both authorization and the complete publication
       * hierarchy have passed do we read premium child data.
       */
      const [
        noteItems,
        taskItems,
      ] =
        await Promise.all([
          scanLessonNotes(
            lessonNoteTableName,
            lessonId,
          ),

          scanLessonTasks(
            lessonTaskTableName,
            lessonId,
          ),
        ]);

      const notes =
        noteItems
          .map(mapPremiumNote)
          .sort(
            sortByOrderAndTitle,
          );

      const tasks =
        taskItems
          .map(mapPremiumTask)
          .sort(
            sortByOrderAndTitle,
          );

      return {
        lessonId:
          getRequiredString(
            lessonItem,
            "id",
          ),

        /*
         * Only existence flags leave the backend boundary.
         *
         * Physical S3 keys remain internal.
         */
        hasVideo:
          Boolean(
            videoPath?.trim(),
          ),

        hasMaterials:
          Boolean(
            materialsPath?.trim(),
          ),

        notes,

        tasks,
      };
    } catch (error) {
      console.error(
        "Failed to load premium lesson content.",
        {
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },
      );

      throw new Error(
        "Nie udało się pobrać treści lekcji.",
      );
    }
  });
