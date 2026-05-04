import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let pillarName: string;
  let issueText: string;

  try {
    const body = await request.json();
    pillarName = body.pillarName;
    issueText = body.issueText;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!pillarName || !issueText) {
    return NextResponse.json({ error: "pillarName and issueText are required" }, { status: 400 });
  }

  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You previously audited this page and found this issue with ${pillarName}: ${issueText}. Generate exactly 3 ready-to-use fixes the website owner can implement immediately. Each fix should be specific and reference the actual content found on their page. No generic advice. For each fix, return a JSON object with two fields: "advice" (one sentence explaining what to do and why) and "copy" (the exact text to paste onto the website, with no explanation, or an empty string if the fix has no specific paste-ready text). Return as a JSON array of exactly 3 objects. Never use em dashes in your response.`,
      },
    ],
  });

  const rawText = message.content[0].type === "text" ? message.content[0].text : "";

  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let fixes: Array<{ advice: string; copy: string }>;
  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    fixes = parsed.slice(0, 3).map((item: unknown) => {
      if (typeof item === "object" && item !== null && "advice" in item) {
        return {
          advice: String((item as Record<string, unknown>).advice ?? ""),
          copy: String((item as Record<string, unknown>).copy ?? ""),
        };
      }
      return { advice: String(item), copy: "" };
    });
    while (fixes.length < 3) fixes.push({ advice: "", copy: "" });
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json({ fixes });
}
