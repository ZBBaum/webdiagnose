export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.STRIPE_SECRET_KEY) return;

  const { stripe, PLANS } = await import("@/lib/stripe");

  await Promise.all(
    Object.values(PLANS).map(async ({ lookupKey, name, amount }) => {
      const { data: existing } = await stripe.prices.list({
        lookup_keys: [lookupKey],
        limit: 1,
      });
      if (existing.length > 0) return;

      const product = await stripe.products.create({ name });
      await stripe.prices.create({
        product: product.id,
        unit_amount: amount,
        currency: "usd",
        recurring: { interval: "month" },
        lookup_key: lookupKey,
      });
      console.log(`[stripe] created ${name} price (${lookupKey})`);
    })
  );
}
