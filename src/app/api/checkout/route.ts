import { NextRequest, NextResponse } from "next/server";
import { getStripe, PLANS, type PlanId } from "@/lib/stripe";

// Redirects to Stripe Checkout for the given plan (pro or agency)
export async function GET(request: NextRequest) {
  console.log("[checkout] STRIPE_PRO_PRICE_ID:", process.env.STRIPE_PRO_PRICE_ID);
  console.log("[checkout] STRIPE_AGENCY_PRICE_ID:", process.env.STRIPE_AGENCY_PRICE_ID);

  const plan = request.nextUrl.searchParams.get("plan") as PlanId | null;
  if (!plan || !(plan in PLANS)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const priceId = PLANS[plan].priceId();
  if (!priceId) {
    return NextResponse.json({ error: "Price not configured" }, { status: 500 });
  }

  const host = request.headers.get("host")!;
  const proto = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${proto}://${host}`;

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/success?plan=${plan}`,
    cancel_url: `${baseUrl}/pricing`,
  });

  return NextResponse.redirect(session.url!);
}
