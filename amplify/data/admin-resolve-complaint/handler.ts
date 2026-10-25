import {
  ConditionalCheckFailedException, DynamoDBClient, UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import type { Schema } from "../resource";
import {
  assertAdmin, COMPLAINT_ID_PATTERN, normalizedText, requireEnv,
} from "../complaints/shared";

const db = new DynamoDBClient({});
const table = requireEnv("COMPLAINT_TABLE_NAME");
export const handler: Schema["adminResolveComplaint"]["functionHandler"] = async (event) => {
  const adminId = assertAdmin(event.identity);
  const { complaintId, decision } = event.arguments;
  if (typeof complaintId !== "string" || !COMPLAINT_ID_PATTERN.test(complaintId)) {
    throw new Error("Nieprawidłowy identyfikator reklamacji.");
  }
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    throw new Error("Nieprawidłowa decyzja.");
  }
  const decisionReason = normalizedText(event.arguments.decisionReason, "uzasadnienie", 10, 2000);
  const now = new Date().toISOString();
  try {
    const updated = await db.send(new UpdateItemCommand({
      TableName: table,
      Key: { complaintId: { S: complaintId } },
      ConditionExpression: "attribute_exists(complaintId) AND #status = :submitted AND attribute_not_exists(decidedAt)",
      UpdateExpression: "SET #status = :decision, decisionReason = :reason, decidedAt = :now, decidedBy = :admin, updatedAt = :now",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":submitted": { S: "SUBMITTED" },
        ":decision": { S: decision },
        ":reason": { S: decisionReason },
        ":now": { S: now },
        ":admin": { S: adminId },
      },
      ReturnValues: "ALL_NEW",
    }));
    return {
      complaintId,
      status: updated.Attributes?.status?.S ?? decision,
      decidedAt: updated.Attributes?.decidedAt?.S ?? now,
    };
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new Error("Reklamacja nie istnieje albo została już rozpatrzona.");
    }
    throw error;
  }
};
