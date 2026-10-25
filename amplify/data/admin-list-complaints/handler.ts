import { DynamoDBClient, GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import type { Schema } from "../resource";
import { assertAdmin, nextCursor, parseCursor, requireEnv, toView } from "../complaints/shared";

const db = new DynamoDBClient({});
const table = requireEnv("COMPLAINT_TABLE_NAME");
export const handler: Schema["adminListComplaints"]["functionHandler"] = async (event) => {
  assertAdmin(event.identity);
  const status = event.arguments.status;
  if (status !== "SUBMITTED" && status !== "APPROVED" && status !== "REJECTED") {
    throw new Error("Nieprawidłowy status reklamacji.");
  }
  const result = await db.send(new QueryCommand({
    TableName: table,
    IndexName: "status-createdAt-index",
    KeyConditionExpression: "#status = :status",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: { ":status": { S: status } },
    ScanIndexForward: false,
    Limit: 20,
    ExclusiveStartKey: parseCursor(event.arguments.nextToken, "status", status),
  }));
  const items = await Promise.all((result.Items ?? []).map(async (key) => {
    const id = key.complaintId?.S;
    if (!id) throw new Error("Invalid complaint index record");
    const record = await db.send(new GetItemCommand({
      TableName: table, Key: { complaintId: { S: id } }, ConsistentRead: true,
    }));
    return record.Item ? toView(record.Item) : null;
  }));
  return {
    items: items.filter((item): item is NonNullable<typeof item> => item !== null && item.status === status),
    nextToken: nextCursor(result.LastEvaluatedKey, "status", status),
  };
};
