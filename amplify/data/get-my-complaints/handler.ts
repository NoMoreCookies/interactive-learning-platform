import { DynamoDBClient, GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import type { Schema } from "../resource";
import { identitySub, nextCursor, parseCursor, requireEnv, toView } from "../complaints/shared";

const db = new DynamoDBClient({});
const table = requireEnv("COMPLAINT_TABLE_NAME");
export const handler: Schema["getMyComplaints"]["functionHandler"] = async (event) => {
  const userId = identitySub(event.identity);
  const limit = 20;
  const result = await db.send(new QueryCommand({
    TableName: table,
    IndexName: "userId-createdAt-index",
    KeyConditionExpression: "userId = :id",
    ExpressionAttributeValues: { ":id": { S: userId } },
    ScanIndexForward: false,
    Limit: limit,
    ExclusiveStartKey: parseCursor(event.arguments.nextToken, "userId", userId),
  }));
  // Index is KEYS_ONLY, so fetch records from the strongly consistent base table.
  const items = await Promise.all((result.Items ?? []).map(async (key) => {
    const id = key.complaintId?.S;
    if (!id) throw new Error("Invalid complaint index record");
    const record = await db.send(new GetItemCommand({
      TableName: table, Key: { complaintId: { S: id } }, ConsistentRead: true,
    }));
    return record.Item ? toView(record.Item) : null;
  }));
  return {
    items: items.filter((item): item is NonNullable<typeof item> => item !== null && item.userId === userId),
    nextToken: nextCursor(result.LastEvaluatedKey, "userId", userId),
  };
};
