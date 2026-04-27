import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS, type PlanId } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const plan = request.nextUrl.searchParams.get("plan") as PlanId | null;
  if (!plan || !(plan in PLANS)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const { lookupKey } = PLANS[plan];
  const { data: prices } = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (!prices.length) {
    return NextResponse.json({ error: "Price not configured" }, { status: 500 });
  }

  const host = request.headers.get("host")!;
  const proto = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${proto}://${host}`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: prices[0].id, quantity: 1 }],
    success_url: `${baseUrl}/success?plan=${plan}`,
    cancel_url: `${baseUrl}/pricing`,
  });

  return NextResponse.redirect(session.url!);
}
