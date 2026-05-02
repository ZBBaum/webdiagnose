import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { scrapePage } from "@/lib/scraper";
import { AUDIT_SYSTEM_PROMPT, buildAuditMessage } from "@/lib/auditor";
import { saveAudit } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

const enc = new TextEncoder();

function sse(event: object): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter is required" }, { status: 400 });
  }

  // Auth + rate-limit checks happen before the stream opens
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { allowed, error: rateLimitError } = await checkRateLimit(request, user?.id ?? null, user?.email ?? null);
  if (!allowed) {
    return NextResponse.json({ error: rateLimitError }, { status: 429 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ── 1. Scrape ──────────────────────────────────────────────────────
        controller.enqueue(sse({ type: "progress", message: "Scraping site…" }));
        console.log("[audit] scraping:", url);
        const scraped = await scrapePage(url);
        console.log("[audit] scrape done");

        // ── 2. Stream Claude ───────────────────────────────────────────────
        controller.enqueue(sse({ type: "progress", message: "Analyzing with AI…" }));
        const client = new Anthropic();
        let rawText = "";
        let tokenCount = 0;

        // Increase tokens to 8192 when a screenshot is included (vision uses more)
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
          // Send a token-count heartbeat every ~200 chars to keep connection alive
          if (tokenCount % 200 < delta.length) {
            controller.enqueue(sse({ type: "tokens", count: tokenCount }));
          }
        });

        const finalMsg = await claudeStream.finalMessage();
        console.log("[audit] Claude done, stop_reason:", finalMsg.stop_reason);
        console.log("[audit] raw (first 500):", rawText.slice(0, 500));

        // ── 3. Parse ───────────────────────────────────────────────────────
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

        // ── 4. Persist (fire-and-forget) ───────────────────────────────────
        saveAudit(url, audit, user?.id ?? null).catch((err) =>
          console.error("[saveAudit]", err instanceof Error ? err.message : err)
        );

        controller.enqueue(sse({ type: "result", data: audit }));
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
