import { NextRequest, NextResponse } from "next/server";
import { discoverLinks } from "@/lib/scraper";
import { createSupabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const TIER_MAX_PAGES: Record<string, number> = {
  free: 1,
  pro: 10,
  agency: 25,
};

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter is required" }, { status: 400 });
  }

  let maxPages = 1;
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();
      const tier = profile?.subscription_tier ?? "free";
      maxPages = TIER_MAX_PAGES[tier] ?? 1;
    }
  } catch {
    // Default to free tier limit if auth lookup fails
  }

  try {
    const pages = await discoverLinks(url);
    return NextResponse.json({ pages: pages.slice(0, maxPages) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to discover pages";
    console.error("[crawl]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
