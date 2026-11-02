import { DynamoDBClient, GetItemCommand, QueryCommand, type AttributeValue } from "@aws-sdk/client-dynamodb";
import type { Schema } from "../resource";
import { assertAdmin, requireEnv } from "../complaints/shared";
const db = new DynamoDBClient({});
export const handler: Schema["adminListRefundReviews"]["functionHandler"] = async (event) => {
  assertAdmin(event.identity);
  const table = requireEnv("STRIPE_EVENT_TABLE_NAME");
  let cursor: Record<string, AttributeValue> | undefined;
  const token = event.arguments.nextToken;
  if (token) {
    try {
      if (token.length > 2000 || !/^[A-Za-z0-9_-]+$/.test(token)) throw new Error();
      const decoded = Buffer.from(token, "base64url");
      if (decoded.toString("base64url") !== token) throw new Error();
      const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decoded));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
          Object.keys(parsed).length !== 1 || !("eventId" in parsed) ||
          typeof parsed.eventId !== "string" || !/^[A-Za-z0-9_-]{1,600}$/.test(parsed.eventId)) throw new Error();
      cursor = { eventId: { S: parsed.eventId }, reviewState: { S: "MANUAL_REVIEW" } };
    } catch {
      throw new Error("Invalid cursor");
    }
  }
  const result = await db.send(new QueryCommand({ TableName: table, IndexName: "reviewState-eventId-index",
    KeyConditionExpression: "reviewState = :type", ExpressionAttributeValues: { ":type": { S: "MANUAL_REVIEW" } },
    Limit: 25, ExclusiveStartKey: cursor,
  }));
  const items = [];
  for (const item of result.Items ?? []) {
    const refundId = item.stripeRefundId.S!;
    const { Item: link } = await db.send(new GetItemCommand({ TableName: table, Key: { eventId: { S: `refund_link_${refundId}` } }, ConsistentRead: true }));
    let outcome = item.outcome.S!;
    if (link?.stripeCheckoutSessionId?.S) {
      const { Item: refund } = await db.send(new GetItemCommand({ TableName: requireEnv("BILLING_REFUND_TABLE_NAME"),
        Key: { stripeCheckoutSessionId: { S: link.stripeCheckoutSessionId.S } }, ConsistentRead: true }));
      if (item.outcome.S?.startsWith("MANUAL_REVIEW_") && !item.eventId.S?.startsWith("incident_") && refund?.origin?.S === "EXTERNAL_IMPORT" && refund.stripeRefundId?.S === refundId && refund.status?.S === "SUCCEEDED") outcome = "ALREADY_RECONCILED";
    }
    items.push({ eventId: item.eventId.S!, stripeRefundId: refundId, outcome });
  }
  return { items, nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify({ eventId: result.LastEvaluatedKey.eventId.S })).toString("base64url") : null };
};
