export const BILLING_CONTRACT_VERSION =
  "1";

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
    unitAmount: 4999,
  },
} satisfies Record<
  BillingPlanCode,
  BillingPlan
>;

export function isBillingPlanCode(
  value: string,
): value is BillingPlanCode {
  return BILLING_PLAN_CODES.some(
    (planCode) => planCode === value,
  );
}