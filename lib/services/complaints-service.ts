import { amplifyClient } from "@/lib/amplify-client";

/** API DTOs never contain Stripe secrets, PaymentIntent or customer IDs. */
export type ComplaintStatus = "SUBMITTED" | "APPROVED" | "REJECTED";
export type ComplaintDecision = "APPROVED" | "REJECTED";

export type ComplaintView = {
  complaintId: string;
  stripeCheckoutSessionId: string;
  userId: string;
  subject: string;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
  decisionReason: string | null;
  decidedAt: string | null;
};

export type MyPurchase = {
  stripeCheckoutSessionId: string;
  amountTotal: number; // Minor units (grosze for PLN).
  currency: string;
  paidAt: string;
  grantedUntil: string | null;
};

type Page<T> = { items: T[]; nextToken: string | null };

export type NewComplaint = {
  stripeCheckoutSessionId: string;
  submissionId: string;
  subject: string;
  description: string;
};

const INVALID_RESPONSE = "Serwer zwrócił nieprawidłowe dane. Spróbuj ponownie później.";
const API_FAILURE = "Nie udało się wykonać operacji. Spróbuj ponownie.";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(INVALID_RESPONSE);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown): string {
  if (typeof value !== "string") throw new Error(INVALID_RESPONSE);
  return value;
}

function optionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return string(value);
}

function status(value: unknown): ComplaintStatus {
  if (value === "SUBMITTED" || value === "APPROVED" || value === "REJECTED") {
    return value;
  }
  throw new Error(INVALID_RESPONSE);
}

function parseComplaint(value: unknown): ComplaintView {
  const item = object(value);
  return {
    complaintId: string(item.complaintId),
    stripeCheckoutSessionId: string(item.stripeCheckoutSessionId),
    userId: string(item.userId),
    subject: string(item.subject),
    description: string(item.description),
    status: status(item.status),
    createdAt: string(item.createdAt),
    updatedAt: string(item.updatedAt),
    decisionReason: optionalString(item.decisionReason),
    decidedAt: optionalString(item.decidedAt),
  };
}

function parsePurchase(value: unknown): MyPurchase {
  const item = object(value);
  const amount = item.amountTotal;
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(INVALID_RESPONSE);
  }
  return {
    stripeCheckoutSessionId: string(item.stripeCheckoutSessionId),
    amountTotal: amount,
    currency: string(item.currency),
    paidAt: string(item.paidAt),
    grantedUntil: optionalString(item.grantedUntil),
  };
}

function parsePage<T>(value: unknown, parse: (input: unknown) => T): Page<T> {
  const data = object(value);
  if (!Array.isArray(data.items)) throw new Error(INVALID_RESPONSE);
  return {
    items: data.items.map(parse),
    nextToken: optionalString(data.nextToken),
  };
}

function requireResult(data: unknown, errors: readonly unknown[] | undefined, operation: string): unknown {
  if (errors?.length) {
    // Don't log GraphQL messages: they can contain submitted text or PII.
    console.error("Complaint API request failed", { operation, errorCount: errors.length });
    throw new Error(API_FAILURE);
  }
  if (data === null || data === undefined) {
    throw new Error(INVALID_RESPONSE);
  }
  return data;
}

export async function getMyPurchases(nextToken?: string): Promise<Page<MyPurchase>> {
  const { data, errors } = await amplifyClient.queries.getMyPurchases(
    { nextToken },
    { authMode: "userPool" },
  );
  return parsePage(requireResult(data, errors, "getMyPurchases"), parsePurchase);
}

export async function getMyComplaints(nextToken?: string): Promise<Page<ComplaintView>> {
  const { data, errors } = await amplifyClient.queries.getMyComplaints(
    { nextToken },
    { authMode: "userPool" },
  );
  return parsePage(requireResult(data, errors, "getMyComplaints"), parseComplaint);
}

export async function createComplaint(input: NewComplaint): Promise<{
  complaintId: string;
  status: ComplaintStatus;
  createdAt: string;
}> {
  const { data, errors } = await amplifyClient.mutations.createComplaint(input, {
    authMode: "userPool",
  });
  const response = object(requireResult(data, errors, "createComplaint"));
  return {
    complaintId: string(response.complaintId),
    status: status(response.status),
    createdAt: string(response.createdAt),
  };
}

export async function adminListComplaints(
  complaintStatus: ComplaintStatus,
  nextToken?: string,
): Promise<Page<ComplaintView>> {
  const { data, errors } = await amplifyClient.queries.adminListComplaints(
    { status: complaintStatus, nextToken },
    { authMode: "userPool" },
  );
  return parsePage(requireResult(data, errors, "adminListComplaints"), parseComplaint);
}

export async function adminResolveComplaint(
  complaintId: string,
  decision: ComplaintDecision,
  decisionReason: string,
): Promise<{ complaintId: string; status: ComplaintStatus; decidedAt: string }> {
  const { data, errors } = await amplifyClient.mutations.adminResolveComplaint(
    { complaintId, decision, decisionReason },
    { authMode: "userPool" },
  );
  const response = object(requireResult(data, errors, "adminResolveComplaint"));
  return {
    complaintId: string(response.complaintId),
    status: status(response.status),
    decidedAt: string(response.decidedAt),
  };
}

/**
 * Financially sensitive ADMIN operations. Authorization is enforced independently
 * in AppSync and Lambda. This client helper is NOT an authorization boundary.
 * The API returns an observation/status, NOT a guarantee that money arrived.
 */
export type RefundOperationResult = {
  status: string;
  stripeRefundId: string | null;
};

function parseRefundOperationResult(value: unknown): RefundOperationResult {
  const result = object(value);
  const currentStatus = string(result.status);
  if (!/^[A-Z_]{2,64}$/.test(currentStatus)) throw new Error(INVALID_RESPONSE);
  const refundId = optionalString(result.stripeRefundId);
if (refundId !== null && !/^(?:re|pyr)_[A-Za-z0-9]{8,220}$/.test(refundId))  {
    throw new Error(INVALID_RESPONSE);
  }
  return { status: currentStatus, stripeRefundId: refundId };
}

export async function adminInitiateRefund(
  complaintId: string,
  stripeCheckoutSessionId: string,
  confirmationSessionId: string,
): Promise<RefundOperationResult> {
  const { data, errors } = await amplifyClient.mutations.adminInitiateRefund(
    { complaintId, stripeCheckoutSessionId, confirmationSessionId },
    { authMode: "userPool" },
  );
  return parseRefundOperationResult(requireResult(data, errors, "adminInitiateRefund"));
}

/** Read Stripe status and reconcile a pre-existing BillingRefund record. No new Stripe refund POST. */
export async function adminReconcileRefund(stripeCheckoutSessionId: string): Promise<RefundOperationResult> {
  const { data, errors } = await amplifyClient.mutations.adminReconcileRefund(
    { stripeCheckoutSessionId },
    { authMode: "userPool" },
  );
  return parseRefundOperationResult(requireResult(data, errors, "adminReconcileRefund"));
}

export async function adminImportExternalRefund(stripeCheckoutSessionId: string, stripeRefundId: string): Promise<RefundOperationResult> {
  const { data, errors } = await amplifyClient.mutations.adminImportExternalRefund({
    stripeCheckoutSessionId, stripeRefundId, confirmationSessionId: stripeCheckoutSessionId, confirmationRefundId: stripeRefundId,
  }, { authMode: "userPool" });
  return parseRefundOperationResult(requireResult(data, errors, "adminImportExternalRefund"));
}

export async function adminListRefundReviews(nextToken?: string) {
  const { data, errors } = await amplifyClient.queries.adminListRefundReviews({ nextToken }, { authMode: "userPool" });
  return parsePage(requireResult(data, errors, "adminListRefundReviews"), (value) => {
    const item = object(value);
    return { eventId: string(item.eventId), stripeRefundId: string(item.stripeRefundId), outcome: string(item.outcome) };
  });
}
