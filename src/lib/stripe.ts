import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PLANS = {
  pro: { name: "Pro", priceId: () => process.env.STRIPE_PRO_PRICE_ID! },
  agency: { name: "Agency", priceId: () => process.env.STRIPE_AGENCY_PRICE_ID! },
} as const;

export type PlanId = keyof typeof PLANS;
