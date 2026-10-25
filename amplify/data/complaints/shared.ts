import {
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";

/** Complaint submissions can only be associated with paid Checkout sessions. */
export const SESSION_ID_PATTERN = /^cs_(?:test|live)_[A-Za-z0-9]{8,220}$/;
export const COMPLAINT_ID_PATTERN = /^cmp_[a-f0-9]{64}$/;
export const SUBMISSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type Attributes = Record<string, AttributeValue>;
export type ComplaintStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export function identitySub(identity: unknown): string {
  if (!identity || typeof identity !== "object") throw new Error("Unauthorized");
  const record = identity as { sub?: unknown; claims?: Record<string, unknown> };
  const sub = typeof record.sub === "string" ? record.sub : record.claims?.sub;
  if (typeof sub !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(sub)) {
    throw new Error("Unauthorized");
  }
  return sub;
}

export function assertAdmin(identity: unknown): string {
  const sub = identitySub(identity);
  const record = identity as { groups?: unknown; claims?: Record<string, unknown> };
  const raw = Array.isArray(record.groups) ? record.groups : record.claims?.["cognito:groups"];
  const groups = Array.isArray(raw)
    ? raw.filter((g): g is string => typeof g === "string")
    : typeof raw === "string" ? raw.split(",").map((g) => g.trim()) : [];
  if (!groups.includes("ADMIN")) throw new Error("Unauthorized");
  return sub;
}

export function requiredString(item: Attributes, field: string): string {
  const value = item[field]?.S;
  if (!value || typeof value !== "string") throw new Error(`Invalid stored record: ${field}`);
  return value;
}

export function normalizedText(value: unknown, name: string, min: number, max: number): string {
  if (typeof value !== "string") throw new Error(`Nieprawidłowe pole: ${name}`);
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  const length = Array.from(normalized).length;
  if (length < min || length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(normalized)) {
    throw new Error(`Nieprawidłowe pole: ${name}`);
  }
  return normalized;
}

export type ComplaintView = {
  complaintId: string;
  stripeCheckoutSessionId: string;
  userId: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  decisionReason: string | null;
  decidedAt: string | null;
};

export function toView(item: Attributes): ComplaintView {
  return {
    complaintId: requiredString(item, "complaintId"),
    stripeCheckoutSessionId: requiredString(item, "stripeCheckoutSessionId"),
    userId: requiredString(item, "userId"),
    subject: requiredString(item, "subject"),
    description: requiredString(item, "description"),
    status: requiredString(item, "status"),
    createdAt: requiredString(item, "createdAt"),
    updatedAt: requiredString(item, "updatedAt"),
    decisionReason: item.decisionReason?.S ?? null,
    decidedAt: item.decidedAt?.S ?? null,
  };
}

/**
 * Opaque pagination token is not an authorization token. The Lambda ALWAYS
 * re-applies the user's Cognito sub or the ADMIN queue status in the query.
 * Validating the cursor prevents unexpected partitions and oversized input.
 */
export function parseCursor(token: string | null | undefined, scope: "userId" | "status", value: string): Attributes | undefined {
  if (!token) return undefined;
  if (typeof token !== "string" || token.length > 1500 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error("Nieprawidłowy token stronicowania.");
  }
  let record: unknown;
  try { record = JSON.parse(Buffer.from(token, "base64url").toString("utf8")); }
  catch { throw new Error("Nieprawidłowy token stronicowania."); }
  if (!record || typeof record !== "object") throw new Error("Nieprawidłowy token stronicowania.");
  const obj = record as Record<string, unknown>;
  if (obj.v !== 1 || obj.scope !== scope || obj.value !== value || typeof obj.id !== "string" || typeof obj.at !== "string") {
    throw new Error("Nieprawidłowy token stronicowania.");
  }
  if (!COMPLAINT_ID_PATTERN.test(obj.id) || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(obj.at)) {
    throw new Error("Nieprawidłowy token stronicowania.");
  }
  return {
    complaintId: { S: obj.id },
    createdAt: { S: obj.at },
    [scope]: { S: value },
  };
}

export function nextCursor(last: Attributes | undefined, scope: "userId" | "status", value: string): string | null {
  if (!last) return null;
  return Buffer.from(JSON.stringify({
    v: 1,
    scope,
    value,
    id: requiredString(last, "complaintId"),
    at: requiredString(last, "createdAt"),
  }), "utf8").toString("base64url");
}
