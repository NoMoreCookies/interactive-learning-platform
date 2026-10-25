import { createHash } from "node:crypto";
import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import type { Schema } from "../resource";
import {
  identitySub, normalizedText, requiredString, requireEnv,
  SESSION_ID_PATTERN, SUBMISSION_ID_PATTERN,
} from "../complaints/shared";

const dynamo = new DynamoDBClient({});
const purchaseTable = requireEnv("BILLING_PURCHASE_TABLE_NAME");
const complaintTable = requireEnv("COMPLAINT_TABLE_NAME");

export const handler: Schema["createComplaint"]["functionHandler"] = async (event) => {
  const userId = identitySub(event.identity);
  const { stripeCheckoutSessionId, submissionId } = event.arguments;
  if (typeof stripeCheckoutSessionId !== "string" || !SESSION_ID_PATTERN.test(stripeCheckoutSessionId)) {
    throw new Error("Nieprawidłowy identyfikator zakupu.");
  }
  if (typeof submissionId !== "string" || !SUBMISSION_ID_PATTERN.test(submissionId)) {
    throw new Error("Nieprawidłowy identyfikator zgłoszenia.");
  }
  const subject = normalizedText(event.arguments.subject, "temat", 5, 120);
  const description = normalizedText(event.arguments.description, "opis", 20, 4000);

  const purchase = await dynamo.send(new GetItemCommand({
    TableName: purchaseTable,
    Key: { stripeCheckoutSessionId: { S: stripeCheckoutSessionId } },
    ConsistentRead: true,
    ProjectionExpression: "userId",
  }));
  // Generic error: existence of another person's purchase is not disclosed.
  if (!purchase.Item || requiredString(purchase.Item, "userId") !== userId) {
    throw new Error("Nie znaleziono zakupu przypisanego do tego konta.");
  }

  const complaintId = "cmp_" + createHash("sha256")
    .update(JSON.stringify([userId, submissionId.toLowerCase()]), "utf8").digest("hex");
  const payloadHash = createHash("sha256")
    .update(JSON.stringify([userId, stripeCheckoutSessionId, subject, description]), "utf8")
    .digest("hex");
  const now = new Date().toISOString();
  try {
    await dynamo.send(new PutItemCommand({
      TableName: complaintTable,
      Item: {
        complaintId: { S: complaintId },
        userId: { S: userId },
        stripeCheckoutSessionId: { S: stripeCheckoutSessionId },
        submissionId: { S: submissionId.toLowerCase() },
        payloadHash: { S: payloadHash },
        subject: { S: subject },
        description: { S: description },
        status: { S: "SUBMITTED" },
        createdAt: { S: now },
        updatedAt: { S: now },
      },
      ConditionExpression: "attribute_not_exists(complaintId)",
    }));
    return { complaintId, status: "SUBMITTED", createdAt: now };
  } catch (error) {
    // A conditional failure might be a legitimate duplicate (network retry),
    // but it must NEVER be treated as permission to overwrite existing data.
    if (!(error instanceof ConditionalCheckFailedException)) throw error;
    const result = await dynamo.send(new GetItemCommand({
      TableName: complaintTable,
      Key: { complaintId: { S: complaintId } },
      ConsistentRead: true,
    }));
    const item = result.Item;
    if (!item || requiredString(item, "userId") !== userId ||
        requiredString(item, "submissionId") !== submissionId.toLowerCase() ||
        requiredString(item, "payloadHash") !== payloadHash) {
      throw new Error("Ten identyfikator wysłania wykorzystano już dla innego zgłoszenia.");
    }
    return {
      complaintId,
      status: requiredString(item, "status"),
      createdAt: requiredString(item, "createdAt"),
    };
  }
};
