import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { AuditResultV2 } from "@/lib/auditor";

export const runtime = "nodejs";

const MISS = NextResponse.json({ hit: false });

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const urlsParam = request.nextUrl.searchParams.get("urls");
  if (!url && !urlsParam) return MISS;

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return MISS;

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  if (urlsParam) {
    const urls = urlsParam.split(",").map((u) => u.trim()).filter(Boolean);
    const pages: { url: string; audit: AuditResultV2; screenshot: string | null }[] = [];

    for (const pageUrl of urls) {
      const { data } = await supabase
        .from("audits")
        .select("full_result, screenshot_base64")
        .eq("url", pageUrl)
        .eq("user_id", user.id)
        .gte("created_at", cutoff)
        .not("full_result", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data?.full_result) return MISS;
      pages.push({ url: pageUrl, audit: data.full_result as AuditResultV2, screenshot: data.screenshot_base64 ?? null });
    }

    return NextResponse.json({ hit: true, pages });
  }

  const { data } = await supabase
    .from("audits")
    .select("full_result, screenshot_base64")
    .eq("url", url!)
    .eq("user_id", user.id)
    .gte("created_at", cutoff)
    .not("full_result", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.full_result) return MISS;

  return NextResponse.json({
    hit: true,
    audit: data.full_result as AuditResultV2,
    screenshot: data.screenshot_base64 ?? null,
  });
}
