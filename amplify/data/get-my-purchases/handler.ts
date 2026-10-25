import { DynamoDBClient, GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import type { Schema } from "../resource";
import { identitySub, requiredString, requireEnv, SESSION_ID_PATTERN } from "../complaints/shared";

const db = new DynamoDBClient({});
const table = requireEnv("BILLING_PURCHASE_TABLE_NAME");

function getCursor(raw: string | null | undefined, userId: string) {
  if (!raw) return undefined;
  if (typeof raw !== "string" || raw.length > 1500 || !/^[A-Za-z0-9_-]+$/.test(raw)) {
    throw new Error("Nieprawidłowy token stronicowania.");
  }
  let decoded: unknown;
  try { decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")); }
  catch { throw new Error("Nieprawidłowy token stronicowania."); }
  if (!decoded || typeof decoded !== "object") throw new Error("Nieprawidłowy token stronicowania.");
  const obj = decoded as Record<string, unknown>;
  if (obj.v !== 1 || obj.userId !== userId || typeof obj.sessionId !== "string" ||
      typeof obj.paidAt !== "string" || !SESSION_ID_PATTERN.test(obj.sessionId) ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(obj.paidAt)) {
    throw new Error("Nieprawidłowy token stronicowania.");
  }
  return {
    stripeCheckoutSessionId: { S: obj.sessionId },
    userId: { S: userId },
    paidAt: { S: obj.paidAt },
  };
}

export const handler: Schema["getMyPurchases"]["functionHandler"] = async (event) => {
  const userId = identitySub(event.identity);
  const result = await db.send(new QueryCommand({
    TableName: table,
    IndexName: "userId-index",
    KeyConditionExpression: "userId = :id",
    ExpressionAttributeValues: { ":id": { S: userId } },
    ScanIndexForward: false,
    Limit: 20,
    ExclusiveStartKey: getCursor(event.arguments.nextToken, userId),
  }));
  const items = await Promise.all((result.Items ?? []).map(async (key) => {
    const sessionId = key.stripeCheckoutSessionId?.S;
    if (!sessionId) throw new Error("Invalid purchase index record");
    const row = await db.send(new GetItemCommand({
      TableName: table,
      Key: { stripeCheckoutSessionId: { S: sessionId } },
      ConsistentRead: true,
    }));
    const item = row.Item;
    if (!item || requiredString(item, "userId") !== userId) return null;
    const amount = Number(item.amountTotal?.N);
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Invalid stored purchase amount");
    return {
      stripeCheckoutSessionId: sessionId,
      paidAt: requiredString(item, "paidAt"),
      amountTotal: amount,
      currency: requiredString(item, "currency"),
      grantedUntil: item.grantedUntil?.S ?? null,
    };
  }));
  const last = result.LastEvaluatedKey;
  return {
    items: items.filter((item): item is NonNullable<typeof item> => item !== null),
    nextToken: last ? Buffer.from(JSON.stringify({
      v: 1,
      userId,
      sessionId: requiredString(last, "stripeCheckoutSessionId"),
      paidAt: requiredString(last, "paidAt"),
    }), "utf8").toString("base64url") : null,
  };
};
