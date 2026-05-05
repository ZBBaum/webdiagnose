import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import ResultsClient from "./ResultsClient";
import type { Tier } from "./ResultsClient";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; urls?: string }>;
}) {
  const { url, urls } = await searchParams;
  if (!url && !urls) redirect("/");

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

  const effectiveUrl = url ?? urls!.split(",")[0] ?? "";
  return <ResultsClient url={effectiveUrl} urls={urls} tier={tier} />;
}
