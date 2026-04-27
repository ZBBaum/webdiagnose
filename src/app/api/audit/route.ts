import { NextRequest, NextResponse } from "next/server";
import { scrapePage } from "@/lib/scraper";
import { auditPage } from "@/lib/auditor";
import { saveAudit } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter is required" }, { status: 400 });
  }
  try {
    const scraped = await scrapePage(url);
    const audit = await auditPage(scraped);

    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

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
