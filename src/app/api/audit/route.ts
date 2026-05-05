import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { scrapePage } from "@/lib/scraper";
import { AUDIT_SYSTEM_PROMPT, buildAuditMessage, resolveAnnotations, parseSectionsToAudit } from "@/lib/auditor";
import type { AuditResultV2, VisualAnnotation } from "@/lib/auditor";
import { saveAudit } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

async function auditOnePage(
  pageUrl: string,
  client: Anthropic,
): Promise<{ audit: AuditResultV2; screenshotBase64: string | null } | null> {
  const t0 = Date.now();
  const scraped = await scrapePage(pageUrl);
  console.log(`[audit] scrape (${pageUrl}): ${Date.now() - t0}ms`);

  const hasScreenshot = !!scraped.screenshotBase64;
  const tClaude = Date.now();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: hasScreenshot ? 8192 : 4096,
    system: AUDIT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildAuditMessage(scraped) as Parameters<typeof client.messages.create>[0]["messages"][0]["content"] }],
  });

  console.log(`[audit] Claude (${pageUrl}): ${Date.now() - tClaude}ms, stop_reason: ${response.stop_reason}`);
  if (response.stop_reason === "max_tokens") {
    console.warn("[audit] response truncated at max_tokens for", pageUrl);
  }

  const raw = response.content.find((b) => b.type === "text")?.text ?? "";
  const audit = parseSectionsToAudit(raw);

  if (!audit.overallGrade) {
    console.error("[audit] no overallGrade for", pageUrl);
    return null;
  }

  if (Array.isArray(audit.visualAnnotations) && scraped.elementMap?.length) {
    resolveAnnotations(audit.visualAnnotations as VisualAnnotation[], scraped.elementMap);
  }

  return { audit, screenshotBase64: scraped.screenshotBase64 };
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");
  const urlsParam = request.nextUrl.searchParams.get("urls");

  if (!urlParam && !urlsParam) {
    return NextResponse.json({ error: "url or urls parameter is required" }, { status: 400 });
  }

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { allowed, error: rateLimitError } = await checkRateLimit(request, user?.id ?? null, user?.email ?? null);
  if (!allowed) {
    return NextResponse.json({ error: rateLimitError }, { status: 429 });
  }

  const client = new Anthropic();

  // ── Multi-page mode ───────────────────────────────────────────────────────
  if (urlsParam) {
    const urls = urlsParam.split(",").map((u) => u.trim()).filter(Boolean).slice(0, 10);
    const sessionId = crypto.randomUUID();
    const pages: { url: string; data: AuditResultV2; screenshot: string | null }[] = [];

    const auditIds: (string | null)[] = [];

    for (const pageUrl of urls) {
      try {
        const result = await auditOnePage(pageUrl, client);
        if (result) {
          let auditId: string | null = null;
          try {
            auditId = await saveAudit(pageUrl, result.audit, user?.id ?? null, result.screenshotBase64, sessionId);
          } catch (err) {
            console.error("[saveAudit]", err instanceof Error ? err.message : err);
          }
          auditIds.push(auditId);
          pages.push({ url: pageUrl, data: result.audit, screenshot: result.screenshotBase64 ?? null });
        }
      } catch (err) {
        console.error("[audit] page failed:", pageUrl, err instanceof Error ? err.message : err);
      }
    }

    if (pages.length === 0) {
      return NextResponse.json({ error: "All pages failed to audit" }, { status: 500 });
    }

    return NextResponse.json({ pages, auditIds, sessionId });
  }

  // ── Single-page mode ──────────────────────────────────────────────────────
  const url = urlParam!;

  try {
    const result = await auditOnePage(url, client);
    if (!result) {
      return NextResponse.json({ error: "Audit failed: Claude did not return expected format" }, { status: 500 });
    }

    let auditId: string | null = null;
    try {
      auditId = await saveAudit(url, result.audit, user?.id ?? null, result.screenshotBase64);
    } catch (err) {
      console.error("[saveAudit]", err instanceof Error ? err.message : err);
    }

    return NextResponse.json({ audit: result.audit, screenshot: result.screenshotBase64 ?? null, auditId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit failed";
    console.error("[audit] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
