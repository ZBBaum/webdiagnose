import Stripe from "stripe";

let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}

export const PLANS = {
  pro: { name: "Pro", priceId: () => process.env.STRIPE_PRO_PRICE_ID! },
  agency: { name: "Agency", priceId: () => process.env.STRIPE_AGENCY_PRICE_ID! },
} as const;

export type PlanId = keyof typeof PLANS;
