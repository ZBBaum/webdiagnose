import Anthropic from "@anthropic-ai/sdk";
import type { ScrapedPage } from "./scraper";

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

const SYSTEM_PROMPT = `You are a conversion rate optimization (CRO) expert. You analyze web page content and provide structured audits.

You will receive scraped page data (headings, body text, buttons, nav items, form fields, links, meta) and must return a JSON audit.

Score each pillar 0–10 (10 = excellent). Be specific and actionable. Base your analysis only on the provided data.

Respond with ONLY valid JSON — no markdown fences, no explanation, no extra text. The exact shape required:

{
  "url": "<string>",
  "grade": "<A|B|C|D|F>",
  "pillars": {
    "valuePropClarity": {
      "score": <0-10>,
      "summary": "<one sentence>",
      "fixes": ["<fix 1>", "<fix 2>", "<optional fix 3>"]
    },
    "ctaStrength": {
      "score": <0-10>,
      "summary": "<one sentence>",
      "fixes": ["<fix 1>", "<fix 2>", "<optional fix 3>"]
    },
    "trustSignals": {
      "score": <0-10>,
      "summary": "<one sentence>",
      "fixes": ["<fix 1>", "<fix 2>", "<optional fix 3>"]
    },
    "copyTone": {
      "score": <0-10>,
      "summary": "<one sentence>",
      "fixes": ["<fix 1>", "<fix 2>", "<optional fix 3>"]
    },
    "frictionDetection": {
      "score": <0-10>,
      "summary": "<one sentence>",
      "fixes": ["<fix 1>", "<fix 2>", "<optional fix 3>"]
    },
    "mobileAccessibility": {
      "score": <0-10>,
      "summary": "<one sentence>",
      "fixes": ["<fix 1>", "<fix 2>", "<optional fix 3>"]
    }
  }
}

Grade rubric: average pillar score ≥9 → A, ≥7.5 → B, ≥6 → C, ≥4.5 → D, else F.

Pillar definitions:
- valuePropClarity: Is the primary value proposition immediately clear from the headline and above-the-fold content?
- ctaStrength: Are CTAs specific, compelling, and well-positioned? Do button labels communicate clear value?
- trustSignals: Are there social proof, customer logos, testimonials, security badges, or credibility indicators?
- copyTone: Is the copy voice consistent, benefit-focused, and appropriate for the audience?
- frictionDetection: Are there unnecessary form fields, confusing navigation, unclear pricing, or barriers to conversion?
- mobileAccessibility: Based on link density, button count, nav structure, and form fields — does the page appear mobile-friendly and accessible?`;

function buildUserMessage(page: ScrapedPage): string {
  const data = {
    url: page.url,
    title: page.title,
    meta: page.meta,
    headings: page.headings,
    bodyText: page.bodyText.slice(0, 60),
    buttons: page.buttons,
    navItems: page.navItems,
    formFields: page.formFields,
    links: page.links.slice(0, 40).map((l) => ({ text: l.text, href: l.href })),
  };
  return JSON.stringify(data, null, 2);
}

export async function auditPage(page: ScrapedPage): Promise<AuditResult> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(page) }],
  });

  const raw = response.content.find((b) => b.type === "text")?.text ?? "";

  try {
    return JSON.parse(raw) as AuditResult;
  } catch {
    throw new Error(`Claude returned invalid JSON:\n${raw}`);
  }
}
