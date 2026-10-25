import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateSurvivingAccess, type PaidPurchase } from "../amplify/shared/refund-entitlement";

const iso = (day: number) => new Date(Date.UTC(2026, 0, day)).toISOString();
function purchase(id: string, paid: number, grantedFrom: number, days = 30): PaidPurchase {
  return {
    stripeCheckoutSessionId: id,
    paidAt: iso(paid),
    grantedFrom: iso(grantedFrom),
    accessDays: days,
  };
}
describe("refund entitlement recalculation", () => {
  it("revokes only purchase -> no surviving access", () => {
    assert.deepEqual(calculateSurvivingAccess([]), { accessUntil: null, lastPurchaseId: null });
  });
  it("preserves one surviving purchase", () => {
    assert.deepEqual(calculateSurvivingAccess([purchase("A", 1, 1)]), {
      accessUntil: iso(31), lastPurchaseId: "A",
    });
  });
  it("extends the earlier end for two overlapping purchases", () => {
    assert.deepEqual(calculateSurvivingAccess([purchase("B", 10, 31), purchase("A", 1, 1)]), {
      accessUntil: iso(61), lastPurchaseId: "B",
    });
  });
  it("refunding the first purchase re-bases the surviving second purchase to its payment date", () => {
    assert.deepEqual(calculateSurvivingAccess([purchase("B", 10, 31)]), {
      accessUntil: iso(40), lastPurchaseId: "B",
    });
  });
  it("refund of the latest purchase leaves the earlier paid period", () => {
    assert.deepEqual(calculateSurvivingAccess([purchase("A", 1, 1)]), {
      accessUntil: iso(31), lastPurchaseId: "A",
    });
  });
  it("after an expired gap a later purchase starts at its actual payment date", () => {
    assert.deepEqual(calculateSurvivingAccess([purchase("A", 1, 1), purchase("B", 100, 100)]), {
      accessUntil: iso(130), lastPurchaseId: "B",
    });
  });
  it("preserves arrival order of out-of-order Stripe webhooks", () => {
    const earlyPaidProcessedLater = purchase("A", 1, 32);
    const laterPaidProcessedFirst = purchase("B", 2, 2);
    assert.deepEqual(calculateSurvivingAccess([earlyPaidProcessedLater, laterPaidProcessedFirst]), {
      accessUntil: iso(62), lastPurchaseId: "A",
    });
  });
  it("rejects duplicate purchase identifiers", () => {
    assert.throws(() => calculateSurvivingAccess([purchase("A", 1, 1), purchase("A", 2, 31)]));
  });
  it("rejects invalid historical duration", () => {
    assert.throws(() => calculateSurvivingAccess([purchase("A", 1, 1, 0)]));
  });
});
