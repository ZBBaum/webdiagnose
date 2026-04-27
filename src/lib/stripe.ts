import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PLANS = {
  pro: { lookupKey: "pro_monthly", name: "Pro", amount: 1900 },
  agency: { lookupKey: "agency_monthly", name: "Agency", amount: 4900 },
} as const;

export type PlanId = keyof typeof PLANS;
