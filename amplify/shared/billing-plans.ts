export const BILLING_CONTRACT_VERSION =
  "1" as const;

/*
 * IMPORTANT:
 *
 * Once a billing contract version has been used in production,
 * its historical meaning must never be changed.
 *
 * CheckoutAttempt stores an immutable snapshot of the actual
 * billing contract used for each Checkout Session.
 *
 * Before production launch, version "1" represents:
 *
 * ONE_MONTH
 * 79.99 PLN
 * 30 days
 */
export const BILLING_PLAN_CODES = [
  "ONE_MONTH",
] as const;

export type BillingPlanCode =
  (typeof BILLING_PLAN_CODES)[number];

export type BillingPlan = {
  checkoutMode: "payment";
  accessDays: number;
  currency: "pln";
  unitAmount: number;
};

export const BILLING_PLANS = {
  ONE_MONTH: {
    checkoutMode: "payment",
    accessDays: 30,
    currency: "pln",
    unitAmount: 7999,
  },
} as const satisfies Record<
  BillingPlanCode,
  BillingPlan
>;

export function isBillingPlanCode(
  value: unknown,
): value is BillingPlanCode {
  return (
    typeof value === "string" &&
    BILLING_PLAN_CODES.some(
      (planCode) =>
        planCode === value,
    )
  );
}