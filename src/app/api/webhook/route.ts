import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhook] Signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email;
    const tier = session.metadata?.tier;
    const stripeCustomerId =
      typeof session.customer === "string" ? session.customer : null;

    if (!email || !tier) {
      console.error("[webhook] Missing email or tier in session", { email, tier });
      return NextResponse.json({ error: "Missing required session data" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError) {
      console.error("[webhook] Failed to list users:", listError.message);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    const user = users.find((u) => u.email === email);
    if (!user) {
      console.error("[webhook] No user found for email:", email);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: user.id,
      email,
      subscription_tier: tier,
      stripe_customer_id: stripeCustomerId,
    });

    if (upsertError) {
      console.error("[webhook] Failed to update profile:", upsertError.message);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    console.log(`[webhook] Updated ${email} -> ${tier}`);
  }

  return NextResponse.json({ received: true });
}
