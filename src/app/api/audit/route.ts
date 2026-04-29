import { NextRequest, NextResponse } from "next/server";
import { scrapePage } from "@/lib/scraper";
import { auditPage } from "@/lib/auditor";
import { saveAudit } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter is required" }, { status: 400 });
  }
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { allowed, error: rateLimitError } = await checkRateLimit(request, user?.id ?? null, user?.email ?? null);
    if (!allowed) {
      return NextResponse.json({ error: rateLimitError }, { status: 429 });
    }

    const scraped = await scrapePage(url);
    const audit = await auditPage(scraped);

    saveAudit(url, audit, user?.id ?? null).catch((err) =>
      console.error("[saveAudit]", err instanceof Error ? err.message : err)
    );

    return NextResponse.json(audit);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Audit failed" },
      { status: 500 }
    );
  }
}
