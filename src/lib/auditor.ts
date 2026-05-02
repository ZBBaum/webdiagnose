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

export interface VisualAnnotation {
  label: string;
  description: string;
  type: "critical" | "warning" | "good";
  x: number;
  y: number;
  width: number;
  height: number;
  refSection?: string;
}

export interface AuditResultV2 {
  classification: Classification;
  fiveSecondTest: FiveSecondTest;
  pillars: PillarResultV2[];
  topFixes: TopFix[];
  revenueImpact: string;
  overallGrade: string;
  visualAnnotations: VisualAnnotation[];
}

// ─── prompt ────────────────────────────────────────────────────────────────

export const AUDIT_SYSTEM_PROMPT = `You are SiteIQ, an elite conversion rate optimization expert with 15 years of experience auditing thousands of websites. You think like a $5,000/day CRO consultant, not a generic AI reviewer.

WRITING STYLE — MANDATORY FOR ALL OUTPUT
Write every finding, summary, issue, and rewrite suggestion as if you are a smart, direct friend explaining it to a small business owner or freelance designer who is not a marketing expert. Use plain English — no jargon, no corporate language, no buzzwords. Instead of "persona-segmented pathways" say "separate sections for each type of visitor." Instead of "transactional trust signals" say "things that make people feel safe buying." Instead of "cognitive friction" say "confusing." Keep the same level of insight and specificity but make it feel like advice from a trusted expert, not a consultant report. Every sentence should be immediately understandable to someone who has never heard of CRO. Never use terms like: leverage, utilize, synergy, holistic, robust, scalable, streamline, optimize (say "improve"), conversion funnel (say "path to buying"), value proposition (say "what makes you different" or "why someone should pick you"), user journey, touchpoints, pain points, or any other marketing jargon. Say what you mean in plain words.

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

SCORING CALIBRATION — MANDATORY
Score generously but honestly. A functional CTA that could be improved scores 6-7, not 3-4. Reserve scores of 1-3 for genuinely broken or missing elements, and 9-10 for truly best-in-class execution. The average well-built website should score around 6 overall. Do not be harsh for the sake of being critical. Most real-world websites should score between 4-8 on each pillar unless they have truly egregious or truly exceptional execution.

STEP 4 — PIE PRIORITY LIST
Surface the TOP 3 fixes ranked by revenue impact. For each:
- The exact fix in one sentence
- Why it matters (estimated conversion impact)
- Difficulty: easy / medium / hard

STEP 5 — REVENUE FRAMING
Write one sentence estimating the revenue impact of fixing the top issues.

STEP 6 — VISUAL ANNOTATIONS (only if a screenshot was provided)
Place 4-8 tight bounding boxes on specific, identifiable elements visible in the screenshot.

COORDINATE PRECISION — CRITICAL
When specifying coordinates, imagine drawing the tightest possible rectangle around just the specific element you are flagging — not the section, not the surrounding whitespace, just the element itself. If you are flagging a button, the box should be the size of that button. If you are flagging a headline, the box should wrap just that text. Only include an annotation if you can see the specific element clearly in the screenshot and are confident in its position. If unsure, omit the annotation.

Boxes should be no larger than 15% width and 8% height unless the element genuinely spans that area.

COORDINATE SYSTEM: all values are percentages of the FULL screenshot pixel dimensions (0–100).
  x, y = top-left corner of the box; width, height = size of the box.

HOW TO PLACE A BOX — for each element:
  1. Find its center point (cx, cy) in percentage coordinates
  2. Measure only the element itself — not its surrounding whitespace or section
  3. Compute: x = cx − width/2, y = cy − height/2

TYPICAL SIZES (width × height in %):
  Primary CTA button:  8–14 × 2–3.5
  Headline / H1 text: 25–55 × 2–4
  Navigation bar:     70–95 × 2–4
  Form / input field: 18–35 × 2–4
  Logo:                6–12 × 2–4
  Social proof badge:  8–20 × 1.5–3

NEVER annotate an entire page section — only a single specific element (one button, one headline, one badge).
- type: "critical" (conversion killer), "warning" (needs improvement), "good" (strong element)
- label: ≤ 25 chars
- description: ≤ 100 chars — what specifically is wrong/right and its conversion impact
- refSection: optionally link this annotation to one specific section of the audit. Use the EXACT pillar name ("Value Proposition", "CTA Strength", "Trust Signals", "Copy Tone", "Friction", "Mobile & Accessibility") OR "fix1"/"fix2"/"fix3" for the top-priority fixes. Omit if the annotation doesn't correspond to a specific section.

Focus on: primary CTA, hero headline, value proposition text, trust badges, nav, forms, pricing.
If no screenshot was provided, return an empty array for visualAnnotations.

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
  "overallGrade": "A|B|C|D|F",
  "visualAnnotations": [
    { "label": "", "description": "", "type": "critical|warning|good", "x": 0, "y": 0, "width": 0, "height": 0, "refSection": "" }
  ]
}`;

// ─── helpers ───────────────────────────────────────────────────────────────

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: "image/png"; data: string } };

export function buildAuditMessage(page: ScrapedPage): string | ContentBlock[] {
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
  const textContent = JSON.stringify(data, null, 2);

  if (!page.screenshotBase64) {
    return textContent;
  }

  return [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: page.screenshotBase64,
      },
    },
    {
      type: "text",
      text: `Here is the scraped content:\n${textContent}\n\nAnd here is a screenshot of the page. Use BOTH the scraped content AND what you can visually see in the screenshot to perform your audit. Reference specific visual elements you can see — layout issues, contrast problems, CTA placement, whitespace, visual hierarchy, font choices, and overall design quality.`,
    },
  ];
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
      messages: [{ role: "user", content: buildAuditMessage(page) as Parameters<typeof client.messages.create>[0]["messages"][0]["content"] }],
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
