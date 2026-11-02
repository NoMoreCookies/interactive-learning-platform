import type { AttributeValue } from "@aws-sdk/client-dynamodb";

export type PurchaseHistory = { head: string | null; count: number; verified: boolean };

// Absence is a legacy/unverified history, never evidence of an empty ledger.
export function purchaseHistory(item: Record<string, AttributeValue>): PurchaseHistory {
  const head = item.purchaseHistoryHead;
  const count = item.purchaseHistoryCount;
  const verified = item.purchaseHistoryState?.S === "VERIFIED_V1";
  if (!head && !count && !verified) return { head: null, count: 0, verified: false };
  const size = Number(count?.N);
  if (!count?.N || !Number.isSafeInteger(size) || size < 0 ||
      (size === 0 ? head?.NULL !== true : !/^cs_(?:test|live)_[A-Za-z0-9]{8,220}$/.test(head?.S ?? ""))) {
    throw new Error("Invalid purchase history anchor; requires investigation.");
  }
  return { head: head?.S ?? null, count: size, verified };
}
