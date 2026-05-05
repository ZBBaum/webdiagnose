import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import SelectClient from "./SelectClient";
import type { Tier } from "@/app/results/ResultsClient";

export default async function SelectPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  if (!url) redirect("/");

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  let tier: Tier = "free";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();
    const t = profile?.subscription_tier;
    if (t === "pro" || t === "agency") tier = t;
  }

  return <SelectClient url={url} tier={tier} />;
}
