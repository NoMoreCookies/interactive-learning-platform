/**
 * Pure billing policy for the ONE_MONTH one-time product.
 *
 * Each non-refunded purchase adds accessDays calendar-independent 24h days
 * starting at max(payment timestamp, current entitlement end). Replay order
 * is derived from immutable grantedFrom values, NOT payment timestamps;
 * Stripe checkout webhooks can arrive out of payment-time order.
 *
 * A successful FULL refund removes its purchase from the timeline. This does
 * not roll back past consumption; it recalculates remaining entitlement from
 * surviving purchases. The business/legal ramifications of early renewals
 * must be approved before enabling live refunds.
 */
export type PaidPurchase = {
  stripeCheckoutSessionId: string;
  paidAt: string;
  grantedFrom: string;
  accessDays: number;
};

const DAY_MS = 86_400_000;
const MAX_SAFE_DAYS = 3650;

function exactIsoTimestamp(value: string): number {
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) {
    throw new Error("Invalid historical purchase timestamp.");
  }
  return time;
}

export function calculateSurvivingAccess(purchases: readonly PaidPurchase[]): {
  accessUntil: string | null;
  lastPurchaseId: string | null;
} {
  const ordered = [...purchases].sort((a, b) => {
    const aMs = exactIsoTimestamp(a.grantedFrom);
    const bMs = exactIsoTimestamp(b.grantedFrom);
    return aMs - bMs || a.stripeCheckoutSessionId.localeCompare(b.stripeCheckoutSessionId);
  });
  let endMs: number | null = null;
  let lastPurchaseId: string | null = null;
  const seen = new Set<string>();

  for (const purchase of ordered) {
    if (!purchase.stripeCheckoutSessionId || seen.has(purchase.stripeCheckoutSessionId)) {
      throw new Error("Duplicate or missing historical purchase identifier.");
    }
    seen.add(purchase.stripeCheckoutSessionId);
    if (!Number.isSafeInteger(purchase.accessDays) || purchase.accessDays <= 0 || purchase.accessDays > MAX_SAFE_DAYS) {
      throw new Error("Invalid historical access duration.");
    }
    const paidMs = exactIsoTimestamp(purchase.paidAt);
    const baseMs = Math.max(paidMs, endMs ?? paidMs);
    endMs = baseMs + purchase.accessDays * DAY_MS;
    if (!Number.isFinite(endMs) || !Number.isFinite(new Date(endMs).getTime())) {
      throw new Error("Invalid computed entitlement timestamp.");
    }
    lastPurchaseId = purchase.stripeCheckoutSessionId;
  }

  return {
    accessUntil: endMs === null ? null : new Date(endMs).toISOString(),
    lastPurchaseId,
  };
}
