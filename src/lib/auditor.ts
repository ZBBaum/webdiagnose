import Anthropic from "@anthropic-ai/sdk";
import type { ScrapedPage } from "./scraper";

// ─── legacy types (UI still uses these — do not remove) ───────────────────

export interface PillarResult {
  score: number;
  summary: string;
  fixes: string[];
}

export interface AuditResult {
  url: string;
  grade: "A" | "B" | "C" | "D" | "F";
  pillars: {
    valuePropClarity: PillarResult;
    ctaStrength: PillarResult;
    trustSignals: PillarResult;
    copyTone: PillarResult;
    frictionDetection: PillarResult;
    mobileAccessibility: PillarResult;
  };
}

// ─── V2 types (new audit engine output) ───────────────────────────────────

export interface Classification {
  siteType: string;
  targetCustomer: string;
  primaryGoal: string;
}

export interface FiveSecondTestItem {
  score: number;
  quote: string;
  finding: string;
}

export interface FiveSecondTest {
  whatItDoes: FiveSecondTestItem;
  whoItsFor: FiveSecondTestItem;
  whatToDo: FiveSecondTestItem;
}

export interface PillarResultV2 {
  name: string;
  score: number;
  summary: string;
  exactIssue: string;
  rewrite: string;
  benchmark: string;
}

export interface TopFix {
  fix: string;
  impact: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface AuditResultV2 {
  classification: Classification;
  fiveSecondTest: FiveSecondTest;
  pillars: PillarResultV2[];
  topFixes: TopFix[];
  revenueImpact: string;
  overallGrade: string;
}

// ─── prompt ────────────────────────────────────────────────────────────────

export const AUDIT_SYSTEM_PROMPT = `You are SiteIQ, an elite conversion rate optimization expert with 15 years of experience auditing thousands of websites. You think like a $5,000/day CRO consultant, not a generic AI reviewer.

STEP 1 — SITE CLASSIFICATION
Analyze the scraped content and determine:
- Site type (SaaS, e-commerce, agency, local business, personal brand, etc.)
- Target customer persona (who is most likely visiting and why)
- Primary conversion goal (sign up, purchase, contact, download, etc.)

STEP 2 — 5-SECOND TEST
Simulate being a first-time visitor with 5 seconds. Answer:
- What does this site do? (clear or unclear?)
- Who is it for? (obvious or not?)
- What should I do next? (is the primary action clear?)
Score each 1-10 and quote the exact text that helps or hurts.

STEP 3 — LIFT MODEL AUDIT (6 pillars)
For each pillar score 0-10 and provide:
- One sentence summary
- The EXACT text or element on the page causing the issue (quote it directly from the scraped content)
- A specific rewrite or fix with actual new copy, not generic advice
- Competitive benchmark: top 20% / average / bottom 25% of similar site types

Pillars: Value Proposition, CTA Strength, Trust Signals, Copy Tone, Friction, Mobile & Accessibility

STEP 4 — PIE PRIORITY LIST
Surface the TOP 3 fixes ranked by revenue impact. For each:
- The exact fix in one sentence
- Why it matters (estimated conversion impact)
- Difficulty: easy / medium / hard

STEP 5 — REVENUE FRAMING
Write one sentence estimating the revenue impact of fixing the top issues.

Return ONLY valid JSON. No markdown, no preamble. Structure:
{
  "classification": { "siteType": "", "targetCustomer": "", "primaryGoal": "" },
  "fiveSecondTest": {
    "whatItDoes": { "score": 0, "quote": "", "finding": "" },
    "whoItsFor":  { "score": 0, "quote": "", "finding": "" },
    "whatToDo":   { "score": 0, "quote": "", "finding": "" }
  },
  "pillars": [
    { "name": "", "score": 0, "summary": "", "exactIssue": "", "rewrite": "", "benchmark": "" }
  ],
  "topFixes": [
    { "fix": "", "impact": "", "difficulty": "easy|medium|hard" }
  ],
  "revenueImpact": "",
  "overallGrade": "A|B|C|D|F"
}`;

// ─── helpers ───────────────────────────────────────────────────────────────

export function buildAuditMessage(page: ScrapedPage): string {
  const data = {
    url: page.url,
    title: page.title,
    meta: page.meta,
    headings: page.headings,
    bodyText: page.bodyText.slice(0, 80),
    buttons: page.buttons,
    navItems: page.navItems,
    formFields: page.formFields,
    links: page.links.slice(0, 40).map((l) => ({ text: l.text, href: l.href })),
  };
  return JSON.stringify(data, null, 2);
}

// ─── audit function ────────────────────────────────────────────────────────

export async function auditPage(page: ScrapedPage): Promise<AuditResultV2> {
  const client = new Anthropic();

  let response: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: AUDIT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildAuditMessage(page) }],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[auditPage] Claude API call failed:", msg);
    throw new Error(`Claude API error: ${msg}`);
  }

  if (response.stop_reason === "max_tokens") {
    console.warn("[auditPage] Response was truncated (hit max_tokens). Raw output below.");
  }

  const raw = response.content.find((b) => b.type === "text")?.text ?? "";

  // Always log raw output so we can diagnose issues in Vercel logs
  console.log("[auditPage] stop_reason:", response.stop_reason);
  console.log("[auditPage] raw response (first 2000 chars):", raw.slice(0, 2000));

  // Strip markdown code fences Claude sometimes adds despite instructions
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as AuditResultV2;
  } catch (parseErr) {
    console.error("[auditPage] JSON parse failed. Full raw response:\n", raw);
    const preview = raw.slice(0, 300);
    throw new Error(
      `Audit failed: Claude did not return valid JSON. ` +
      `stop_reason=${response.stop_reason}. ` +
      `Response preview: ${preview}`
    );
  }
}
