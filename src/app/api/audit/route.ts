import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { scrapePage } from "@/lib/scraper";
import { AUDIT_SYSTEM_PROMPT, buildAuditMessage, resolveAnnotations } from "@/lib/auditor";
import { saveAudit } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

const enc = new TextEncoder();

function sse(event: object): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(event)}\n\n`);
}

async function auditOnePage(
  pageUrl: string,
  client: Anthropic,
  controller: ReadableStreamDefaultController
): Promise<{ audit: unknown; screenshotBase64: string | null } | null> {
  const scraped = await scrapePage(pageUrl);

  const hasScreenshot = !!scraped.screenshotBase64;
  const claudeStream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: hasScreenshot ? 8192 : 4096,
    system: AUDIT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildAuditMessage(scraped) as Parameters<typeof client.messages.stream>[0]["messages"][0]["content"] }],
  });

  let rawText = "";
  let tokenCount = 0;
  claudeStream.on("text", (delta) => {
    rawText += delta;
    tokenCount += delta.length;
    if (tokenCount % 200 < delta.length) {
      controller.enqueue(sse({ type: "tokens", count: tokenCount }));
    }
  });

  const finalMsg = await claudeStream.finalMessage();
  if (finalMsg.stop_reason === "max_tokens") {
    console.warn("[audit] response truncated at max_tokens for", pageUrl);
  }

  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let audit: unknown;
  try {
    audit = JSON.parse(cleaned);
  } catch {
    console.error("[audit] JSON parse failed for", pageUrl, rawText.slice(0, 200));
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = audit as any;
  if (Array.isArray(a.visualAnnotations) && scraped.elementMap?.length) {
    resolveAnnotations(a.visualAnnotations, scraped.elementMap);
  }

  return { audit, screenshotBase64: scraped.screenshotBase64 };
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");
  const urlsParam = request.nextUrl.searchParams.get("urls");

  if (!urlParam && !urlsParam) {
    return NextResponse.json({ error: "url or urls parameter is required" }, { status: 400 });
  }

  // Auth + rate-limit (counted once per session regardless of page count)
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { allowed, error: rateLimitError } = await checkRateLimit(request, user?.id ?? null, user?.email ?? null);
  if (!allowed) {
    return NextResponse.json({ error: rateLimitError }, { status: 429 });
  }

  // ── Multi-page mode ───────────────────────────────────────────────────────
  if (urlsParam) {
    const urls = urlsParam.split(",").map((u) => u.trim()).filter(Boolean).slice(0, 10);
    const sessionId = crypto.randomUUID();
    const client = new Anthropic();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (let i = 0; i < urls.length; i++) {
            const pageUrl = urls[i];
            controller.enqueue(sse({
              type: "progress",
              message: `Auditing page ${i + 1} of ${urls.length}…`,
              pageIndex: i,
              total: urls.length,
              url: pageUrl,
            }));

            try {
              controller.enqueue(sse({ type: "progress", message: `Scraping ${pageUrl}…`, pageIndex: i, total: urls.length }));
              const result = await auditOnePage(pageUrl, client, controller);

              if (!result) {
                controller.enqueue(sse({ type: "page_error", pageIndex: i, total: urls.length, url: pageUrl, message: "Failed to parse AI response" }));
                continue;
              }

              // Fire-and-forget save with session grouping
              saveAudit(pageUrl, result.audit as Parameters<typeof saveAudit>[1], user?.id ?? null, result.screenshotBase64, sessionId)
                .catch((err) => console.error("[saveAudit]", err instanceof Error ? err.message : err));

              controller.enqueue(sse({
                type: "page_result",
                pageIndex: i,
                total: urls.length,
                url: pageUrl,
                data: result.audit,
                screenshot: result.screenshotBase64 ?? null,
              }));
            } catch (err) {
              const message = err instanceof Error ? err.message : "Page audit failed";
              console.error("[audit] page failed:", pageUrl, message);
              controller.enqueue(sse({ type: "page_error", pageIndex: i, total: urls.length, url: pageUrl, message }));
            }
          }

          controller.enqueue(sse({ type: "complete" }));
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Audit failed";
          console.error("[audit] multi-page failed:", message);
          controller.enqueue(sse({ type: "error", message }));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  // ── Single-page mode (unchanged) ─────────────────────────────────────────
  const url = urlParam!;
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(sse({ type: "progress", message: "Scraping site…" }));
        console.log("[audit] scraping:", url);
        const scraped = await scrapePage(url);
        console.log("[audit] scrape done");

        controller.enqueue(sse({ type: "progress", message: "Analyzing with AI…" }));
        const client = new Anthropic();
        let rawText = "";
        let tokenCount = 0;

        const hasScreenshot = !!scraped.screenshotBase64;
        console.log("[audit] screenshot captured:", hasScreenshot);

        const claudeStream = client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: hasScreenshot ? 8192 : 4096,
          system: AUDIT_SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildAuditMessage(scraped) as Parameters<typeof client.messages.stream>[0]["messages"][0]["content"] }],
        });

        claudeStream.on("text", (delta) => {
          rawText += delta;
          tokenCount += delta.length;
          if (tokenCount % 200 < delta.length) {
            controller.enqueue(sse({ type: "tokens", count: tokenCount }));
          }
        });

        const finalMsg = await claudeStream.finalMessage();
        console.log("[audit] Claude done, stop_reason:", finalMsg.stop_reason);
        console.log("[audit] raw (first 500):", rawText.slice(0, 500));

        if (finalMsg.stop_reason === "max_tokens") {
          console.warn("[audit] response truncated at max_tokens");
        }

        const cleaned = rawText
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```\s*$/, "")
          .trim();

        let audit;
        try {
          audit = JSON.parse(cleaned);
        } catch {
          console.error("[audit] JSON parse failed. Full raw:\n", rawText);
          controller.enqueue(sse({
            type: "error",
            message: `Audit failed: Claude returned invalid JSON (stop_reason=${finalMsg.stop_reason}). Preview: ${rawText.slice(0, 200)}`,
          }));
          controller.close();
          return;
        }

        if (Array.isArray(audit.visualAnnotations) && scraped.elementMap?.length) {
          resolveAnnotations(audit.visualAnnotations, scraped.elementMap);
        }

        saveAudit(url, audit, user?.id ?? null, scraped.screenshotBase64).catch((err) =>
          console.error("[saveAudit]", err instanceof Error ? err.message : err)
        );

        controller.enqueue(sse({
          type: "result",
          data: audit,
          screenshot: scraped.screenshotBase64 ?? null,
        }));
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Audit failed";
        console.error("[audit] failed:", message);
        controller.enqueue(sse({ type: "error", message }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
