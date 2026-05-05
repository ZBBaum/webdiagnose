import Anthropic from "@anthropic-ai/sdk";
import type { ScrapedPage, ElementMapEntry } from "./scraper";

// ─── legacy types (UI still uses these, do not remove) ────────────────────

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
  elementText?: string | null;
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

WRITING STYLE: MANDATORY FOR ALL OUTPUT
Write every finding, summary, issue, and rewrite suggestion as if you are a smart, direct friend explaining it to a small business owner or freelance designer who is not a marketing expert. Use plain English. No jargon, no corporate language, no buzzwords. Instead of "persona-segmented pathways" say "separate sections for each type of visitor." Instead of "transactional trust signals" say "things that make people feel safe buying." Instead of "cognitive friction" say "confusing." Keep the same level of insight and specificity but make it feel like advice from a trusted expert, not a consultant report. Every sentence should be immediately understandable to someone who has never heard of CRO. Never use terms like: leverage, utilize, synergy, holistic, robust, scalable, streamline, optimize (say "improve"), conversion funnel (say "path to buying"), value proposition (say "what makes you different" or "why someone should pick you"), user journey, touchpoints, pain points, or any other marketing jargon. Say what you mean in plain words.

FORMATTING: Never use em dashes in any output. Use commas, periods, or rewrite the sentence instead.

STEP 1: SITE CLASSIFICATION
Analyze the scraped content and determine:
- Site type (SaaS, e-commerce, agency, local business, personal brand, etc.)
- Target customer persona (who is most likely visiting and why)
- Primary conversion goal (sign up, purchase, contact, download, etc.)

STEP 2: 5-SECOND TEST
Simulate being a first-time visitor with 5 seconds. Answer:
- What does this site do? (clear or unclear?)
- Who is it for? (obvious or not?)
- What should I do next? (is the primary action clear?)
Score each 1-10 and quote the exact text that helps or hurts.

STEP 3: LIFT MODEL AUDIT (6 pillars)
For each pillar score 0-10 and provide:
- One sentence summary
- The EXACT text or element on the page causing the issue (quote it directly from the scraped content)
- A specific rewrite or fix with actual new copy, not generic advice
- Competitive benchmark: top 20% / average / bottom 25% of similar site types

Pillars: Value Proposition, CTA Strength, Trust Signals, Copy Tone, Friction, Mobile & Accessibility

SCORING CALIBRATION: MANDATORY
Score generously but honestly. A functional CTA that could be improved scores 6-7, not 3-4. Reserve scores of 1-3 for genuinely broken or missing elements, and 9-10 for truly best-in-class execution. The average well-built website should score around 6 overall. Do not be harsh for the sake of being critical. Most real-world websites should score between 4-8 on each pillar unless they have truly egregious or truly exceptional execution.

STEP 4: PIE PRIORITY LIST
Surface the TOP 3 fixes ranked by revenue impact. For each:
- The exact fix in one sentence
- Why it matters (estimated conversion impact)
- Difficulty: easy / medium / hard

STEP 5: REVENUE FRAMING
Write one sentence estimating the revenue impact of fixing the top issues.

STEP 6: VISUAL ANNOTATIONS (only if a screenshot was provided)
Place 4-8 tight bounding boxes on specific, identifiable elements visible in the screenshot.

ELEMENT TARGETING: MANDATORY
The scraped content includes an ANNOTATION TARGETS list. This is the exact visible text of every interactive and structural element on the page, each prefixed with its HTML tag in brackets (e.g. "[h1] Get Started Free" or "[button] Sign Up Today").

For each annotation you place:
1. Find the element you want to flag in the ANNOTATION TARGETS list
2. Set "elementText" to the text portion EXACTLY as it appears after the [tag] prefix. Copy it character-for-character, with zero changes, no truncation, no rephrasing.
3. Also fill in your best-guess x/y/width/height coordinates using the rules below (used as a fallback if the text cannot be matched)

If the element you want to flag is NOT in the ANNOTATION TARGETS list, set elementText to null and rely on coordinates only.

COORDINATE PRECISION: CRITICAL (fallback when elementText is null or unmatched)
When specifying coordinates, imagine drawing the tightest possible rectangle around just the specific element you are flagging, not the section, not the surrounding whitespace, just the element itself. If you are flagging a button, the box should be the size of that button. If you are flagging a headline, the box should wrap just that text. Only include an annotation if you can see the specific element clearly in the screenshot and are confident in its position. If unsure, omit the annotation.

Boxes should be no larger than 15% width and 8% height unless the element genuinely spans that area.

COORDINATE SYSTEM: all values are percentages of the FULL screenshot pixel dimensions (0-100).
  x, y = top-left corner of the box; width, height = size of the box.

HOW TO PLACE A BOX, for each element:
  1. Find its center point (cx, cy) in percentage coordinates
  2. Measure only the element itself, not its surrounding whitespace or section
  3. Compute: x = cx - width/2, y = cy - height/2

TYPICAL SIZES (width x height in %):
  Primary CTA button:  8-14 x 2-3.5
  Headline / H1 text: 25-55 x 2-4
  Navigation bar:     70-95 x 2-4
  Form / input field: 18-35 x 2-4
  Logo:                6-12 x 2-4
  Social proof badge:  8-20 x 1.5-3

NEVER annotate an entire page section. Only a single specific element (one button, one headline, one badge).
- type: "critical" (conversion killer), "warning" (needs improvement), "good" (strong element)
- label: 25 chars max
- description: 100 chars max. What specifically is wrong/right and its conversion impact.
- refSection: optionally link this annotation to one specific section of the audit. Use the EXACT pillar name ("Value Proposition", "CTA Strength", "Trust Signals", "Copy Tone", "Friction", "Mobile & Accessibility") OR "fix1"/"fix2"/"fix3" for the top-priority fixes. Omit if the annotation doesn't correspond to a specific section.

Focus on: primary CTA, hero headline, value proposition text, trust badges, nav, forms, pricing.
If no screenshot was provided, return an empty array for visualAnnotations.

Output each section using a <<<SECTION:key>>> marker on its own line, followed immediately by the JSON value for that section. No wrapper object. No markdown. No preamble. Output sections in this exact order so results appear to the user as fast as possible:

<<<SECTION:overallGrade>>>
"A|B|C|D|F"
<<<SECTION:classification>>>
{"siteType":"","targetCustomer":"","primaryGoal":""}
<<<SECTION:revenueImpact>>>
"..."
<<<SECTION:fiveSecondTest>>>
{"whatItDoes":{"score":0,"quote":"","finding":""},"whoItsFor":{"score":0,"quote":"","finding":""},"whatToDo":{"score":0,"quote":"","finding":""}}
<<<SECTION:pillars>>>
[{"name":"","score":0,"summary":"","exactIssue":"","rewrite":"","benchmark":""}]
<<<SECTION:topFixes>>>
[{"fix":"","impact":"","difficulty":"easy|medium|hard"}]
<<<SECTION:visualAnnotations>>>
[{"label":"","description":"","type":"critical|warning|good","elementText":"exact text from targets list or null","x":0,"y":0,"width":0,"height":0,"refSection":""}]`;

// ─── helpers ───────────────────────────────────────────────────────────────

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: "image/jpeg"; data: string } };

const TAG_PRIORITY: Record<string, number> = {
  h1: 0, h2: 1, h3: 2, h4: 3,
  button: 4, a: 5, input: 6, select: 7, textarea: 8,
  label: 9, img: 10,
};

function buildAnnotationTargets(elementMap: ElementMapEntry[]): string {
  if (!elementMap.length) return "";
  const sorted = [...elementMap].sort((a, b) => {
    const pa = TAG_PRIORITY[a.tag] ?? 99;
    const pb = TAG_PRIORITY[b.tag] ?? 99;
    return pa !== pb ? pa - pb : a.y - b.y;
  });
  const lines = sorted.slice(0, 60).map((e) => `[${e.tag}] ${e.text.slice(0, 80)}`);
  return `\n\nANNOTATION TARGETS (set elementText to EXACTLY the text after the [tag] prefix, copied character-for-character):\n${lines.join("\n")}`;
}

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
  const targets = buildAnnotationTargets(page.elementMap ?? []);
  const fullText = textContent + targets;

  if (!page.screenshotBase64) {
    return fullText;
  }

  return [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: page.screenshotBase64,
      },
    },
    {
      type: "text",
      text: `Here is the scraped content:\n${fullText}\n\nAnd here is a screenshot of the page. Use BOTH the scraped content AND what you can visually see in the screenshot to perform your audit. Reference specific visual elements you can see, including layout issues, contrast problems, CTA placement, whitespace, visual hierarchy, font choices, and overall design quality.`,
    },
  ];
}

// ─── annotation coordinate resolution ─────────────────────────────────────

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(" ").filter((w) => w.length > 1));
  const wordsB = new Set(b.split(" ").filter((w) => w.length > 1));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let common = 0;
  for (const w of wordsA) if (wordsB.has(w)) common++;
  return common / Math.max(wordsA.size, wordsB.size);
}

function findBestMatch(elementText: string, elementMap: ElementMapEntry[]): ElementMapEntry | null {
  const norm = normalizeText(elementText);
  if (!norm) return null;

  for (const entry of elementMap) {
    if (normalizeText(entry.text) === norm) return entry;
  }

  for (const entry of elementMap) {
    const n = normalizeText(entry.text);
    if (n.includes(norm) || norm.includes(n)) return entry;
  }

  let best: ElementMapEntry | null = null;
  let bestScore = 0;
  for (const entry of elementMap) {
    const score = wordOverlap(norm, normalizeText(entry.text));
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  return bestScore >= 0.6 ? best : null;
}

export function resolveAnnotations(
  annotations: VisualAnnotation[],
  elementMap: ElementMapEntry[]
): void {
  if (!elementMap.length) return;
  for (const ann of annotations) {
    if (!ann.elementText) continue;
    const match = findBestMatch(ann.elementText, elementMap);
    if (match) {
      ann.x = match.x;
      ann.y = match.y;
      ann.width = match.width;
      ann.height = match.height;
    }
  }
}

// ─── section parser ────────────────────────────────────────────────────────

const SECTION_RE = /<<<SECTION:(\w+)>>>/g;

export function parseSectionsToAudit(text: string): AuditResultV2 {
  const markers: { key: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  SECTION_RE.lastIndex = 0;
  while ((m = SECTION_RE.exec(text)) !== null) {
    markers.push({ key: m[1], start: m.index, end: m.index + m[0].length });
  }
  const obj: Record<string, unknown> = {};
  for (let i = 0; i < markers.length; i++) {
    const { key, end } = markers[i];
    const textEnd = i < markers.length - 1 ? markers[i + 1].start : text.length;
    const json = text.slice(end, textEnd).trim();
    try { obj[key] = JSON.parse(json); } catch { /* skip incomplete */ }
  }
  return obj as unknown as AuditResultV2;
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

  console.log("[auditPage] stop_reason:", response.stop_reason);
  console.log("[auditPage] raw response (first 500 chars):", raw.slice(0, 500));

  const result = parseSectionsToAudit(raw);
  if (!result.overallGrade) {
    console.error("[auditPage] section parse produced no overallGrade. Full raw:\n", raw);
    throw new Error(`Audit failed: Claude did not return expected section format. stop_reason=${response.stop_reason}. Preview: ${raw.slice(0, 300)}`);
  }
  return result;
}
