import {
  BILLING_PLANS,
} from "../../amplify/shared/billing-plans";

/*
 * Frontend presentation data.
 *
 * This module intentionally derives the public amount and duration
 * from the same pure billing-plan definition used by the backend.
 *
 * IMPORTANT:
 * Browser-visible values are never an authorization or payment
 * boundary. Stripe Price validation and the immutable CheckoutAttempt
 * remain authoritative on the backend.
 */
const oneMonthPlan =
  BILLING_PLANS.ONE_MONTH;

export const ONE_MONTH_PUBLIC_PLAN = {
  code:
    "ONE_MONTH",

  unitAmount:
    oneMonthPlan.unitAmount,

  currency:
    oneMonthPlan.currency
      .toUpperCase(),

  accessDays:
    oneMonthPlan.accessDays,
} as const;

export const ONE_MONTH_PRICE_LABEL =
  new Intl.NumberFormat(
    "pl-PL",
    {
      style:
        "currency",

      currency:
        ONE_MONTH_PUBLIC_PLAN.currency,
    },
  ).format(
    ONE_MONTH_PUBLIC_PLAN
      .unitAmount /
      100,
  );
