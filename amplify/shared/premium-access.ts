import { boundedAwsOptions, budgetedClient, hasResolverBudget } from "./resolver-budget";
import {
  DynamoDBClient,
  GetItemCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";

const dynamoDb = new DynamoDBClient({});
// Only the remediated synchronous callers opt into the shorter SDK budget.
const synchronousDynamoDb = budgetedClient(new DynamoDBClient(boundedAwsOptions));

type DynamoDbItem =
  Record<string, AttributeValue>;

type PremiumAccessInput = {
  identity: unknown;
  entitlementTableName: string;
  nowMs?: number;
};

export type PremiumAccessStatus = {
  active: boolean;
  accessUntil: string | null;
};

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

  const claimGroups = (
    claims as Record<
      string,
      unknown
    >
  )["cognito:groups"];

  if (
    Array.isArray(
      claimGroups,
    )
  ) {
    return claimGroups.filter(
      (
        group,
      ): group is string =>
        typeof group ===
        "string",
    );
  }

  if (
    typeof claimGroups ===
    "string"
  ) {
    return claimGroups
      .split(",")
      .map((group) =>
        group.trim(),
      )
      .filter(Boolean);
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

function getAuthenticatedUserId(
  identity: unknown,
): string | null {
  if (
    !identity ||
    typeof identity !== "object"
  ) {
    return null;
  }

  const identityRecord =
    identity as Record<
      string,
      unknown
    >;

  if (
    typeof identityRecord.sub ===
      "string" &&
    identityRecord.sub.trim()
  ) {
    return identityRecord.sub.trim();
  }

  const claims =
    identityRecord.claims;

  if (
    claims &&
    typeof claims === "object"
  ) {
    const claimSub = (
      claims as Record<
        string,
        unknown
      >
    ).sub;

    if (
      typeof claimSub ===
        "string" &&
      claimSub.trim()
    ) {
      return claimSub.trim();
    }
  }

  return null;
}

function getStringAttribute(
  item: DynamoDbItem,
  fieldName: string,
): string | null {
  const value =
    item[fieldName];

  if (
    !value ||
    !("S" in value) ||
    typeof value.S !== "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.S.trim();

  return normalizedValue ||
    null;
}

function isCanonicalIsoTimestamp(
  value: string,
): boolean {
  const timestamp =
    Date.parse(value);

  if (
    !Number.isFinite(
      timestamp,
    )
  ) {
    return false;
  }

  return (
    new Date(
      timestamp,
    ).toISOString() === value
  );
}

export async function getPremiumAccessStatus({
  identity,
  entitlementTableName,
  nowMs = Date.now(),
}: PremiumAccessInput): Promise<PremiumAccessStatus> {
  /*
   * ADMIN has premium application access without requiring
   * a paid entitlement.
   */
  if (
    isAdminIdentity(
      identity,
    )
  ) {
    return {
      active: true,
      accessUntil: null,
    };
  }

  /*
   * The user identifier always comes from authenticated Cognito
   * identity, never from browser-controlled input.
   */
  const userId =
    getAuthenticatedUserId(
      identity,
    );

  if (!userId) {
    return {
      active: false,
      accessUntil: null,
    };
  }

  const result =
    await (hasResolverBudget() ? synchronousDynamoDb : dynamoDb).send(
      new GetItemCommand({
        TableName:
          entitlementTableName,

        Key: {
          userId: {
            S: userId,
          },
        },

        ProjectionExpression:
          "#productCode, #accessUntil, #revokedAt",

        ExpressionAttributeNames: {
          "#productCode":
            "productCode",

          "#accessUntil":
            "accessUntil",

          "#revokedAt":
            "revokedAt",
        },

        /*
         * Avoid stale authorization immediately after payment.
         */
        ConsistentRead: true,
      }),
    );

  const item =
    result.Item;

  if (!item) {
    return {
      active: false,
      accessUntil: null,
    };
  }

  const productCode =
    getStringAttribute(
      item,
      "productCode",
    );

  if (
    productCode !==
    "PREMIUM"
  ) {
    return {
      active: false,
      accessUntil: null,
    };
  }

  const accessUntil =
    getStringAttribute(
      item,
      "accessUntil",
    );

  if (
    !accessUntil ||
    !isCanonicalIsoTimestamp(
      accessUntil,
    )
  ) {
    return {
      active: false,
      accessUntil: null,
    };
  }

  /*
   * Any revocation marker disables access immediately.
   */
  if (
    item.revokedAt !==
    undefined
  ) {
    return {
      active: false,
      accessUntil,
    };
  }

  return {
    active:
      Date.parse(
        accessUntil,
      ) > nowMs,

    accessUntil,
  };
}

export async function hasPremiumAccess(
  input: PremiumAccessInput,
): Promise<boolean> {
  const status =
    await getPremiumAccessStatus(
      input,
    );

  return status.active;
}