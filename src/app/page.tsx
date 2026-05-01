"use client";

import { motion } from "framer-motion";
import {
  ArrowRight, Zap, Layers, Unlock, Link2, BarChart3, Wrench,
  Target, MousePointerClick, ShieldCheck, FileText, AlertTriangle,
  Smartphone, Check, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── shared fade-in wrapper ────────────────────────────────────────────────

function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

// ─── section label ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase text-violet-400 border border-violet-500/25 bg-violet-500/10">
      {children}
    </span>
  );
}

// ─── data ──────────────────────────────────────────────────────────────────

const PILLS = [
  { icon: Zap, label: "15-second analysis" },
  { icon: Layers, label: "6 conversion pillars" },
  { icon: Unlock, label: "No signup required" },
];

const HOW_STEPS = [
  {
    icon: Link2,
    step: "1",
    title: "Paste your URL",
    desc: "Drop any page URL into the box. No login, no browser extension, no waiting.",
  },
  {
    icon: BarChart3,
    step: "2",
    title: "Get your grade",
    desc: "AI analyzes 6 conversion pillars and returns a letter grade in ~15 seconds.",
  },
  {
    icon: Wrench,
    step: "3",
    title: "Fix what's broken",
    desc: "Each pillar comes with ranked, actionable fixes so you know exactly what to tackle first.",
  },
];

const PILLARS = [
  {
    icon: Target,
    name: "Value Proposition",
    desc: "Is your core message clear and compelling within the first 5 seconds of landing?",
  },
  {
    icon: MousePointerClick,
    name: "CTA Strength",
    desc: "Are your calls-to-action prominent, specific, and persuasive enough to drive clicks?",
  },
  {
    icon: ShieldCheck,
    name: "Trust Signals",
    desc: "Does your site show reviews, credentials, and social proof that builds buyer confidence?",
  },
  {
    icon: FileText,
    name: "Copy & Tone",
    desc: "Is your writing clear, benefit-focused, and tuned to the language of your audience?",
  },
  {
    icon: AlertTriangle,
    name: "Friction Detection",
    desc: "Are there hidden barriers — long forms, confusing nav, unclear pricing — killing conversions?",
  },
  {
    icon: Smartphone,
    name: "Mobile & Accessibility",
    desc: "Does your page work flawlessly on mobile and for users with accessibility needs?",
  },
];

const EXAMPLE_PILLARS = [
  { name: "Value Proposition", score: 8, fixes: [
    "Lead headline mentions features, not customer outcomes — rewrite around the result.",
    "Value prop is below the fold on mobile. Move it to the first 100px.",
  ]},
  { name: "Copy & Tone", score: 8, fixes: [
    "Product description uses 'cutting-edge' and 'best-in-class' — replace with specifics.",
    "FAQ section answers questions nobody is asking. Survey real customers for actual objections.",
  ]},
  { name: "CTA Strength", score: 7, fixes: [
    "Primary CTA says 'Submit' — change to action-outcome phrasing like 'Start my free audit'.",
    "Secondary CTA competes with primary — reduce visual weight or remove it entirely.",
  ]},
  { name: "Mobile & Accessibility", score: 7, fixes: [
    "Tap targets in the nav are 28px — increase to 44px minimum.",
    "Hero image lacks alt text, failing basic accessibility standards.",
  ]},
  { name: "Trust Signals", score: 6, fixes: [
    "No testimonials visible above the fold. Add 1–2 short quotes from real customers.",
    "Security badge is missing near the checkout button where anxiety peaks.",
    "Logo bar shows generic icons — replace with recognizable brand logos.",
  ]},
  { name: "Friction Detection", score: 5, fixes: [
    "Signup form collects 8 fields. Cut to 3 (email, password, name) and ask more later.",
    "Pricing page is 3 clicks from the homepage — surface it in the main nav.",
    "Navigation has 14 top-level links. Group into 4 categories max.",
  ]},
];

const scoreColor = (s: number) =>
  s >= 8 ? "text-emerald-400" : s >= 6 ? "text-amber-400" : "text-rose-400";

const scoreBg = (s: number) =>
  s >= 8 ? "bg-emerald-500/10 border-emerald-500/20" : s >= 6 ? "bg-amber-500/10 border-amber-500/20" : "bg-rose-500/10 border-rose-500/20";

const scoreBar = (s: number) =>
  s >= 8 ? "bg-emerald-500" : s >= 6 ? "bg-amber-500" : "bg-rose-500";

const PLANS = [
  {
    variant: "free" as const,
    name: "Free",
    price: null,
    description: "Try it out, no strings attached.",
    features: ["1 audit per day", "Single page per audit", "No history saved"],
    cta: "Get started free",
    href: "/",
  },
  {
    variant: "pro" as const,
    name: "Pro",
    price: "19.99",
    description: "For founders and marketers serious about conversion.",
    features: ["10 audits per day", "Full site audit", "Score history", "PDF export"],
    cta: "Start Pro — $19.99/mo",
    href: "/pricing",
  },
  {
    variant: "agency" as const,
    name: "Agency",
    price: "49.99",
    description: "Built for teams running audits at scale.",
    features: ["Unlimited audits", "White-label PDF reports", "Team seats", "Priority support"],
    cta: "Start Agency — $49.99/mo",
    href: "/pricing",
  },
];

// ─── page ──────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="bg-[#080808] text-white min-h-screen">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section id="hero" className="relative min-h-[calc(100vh-76px)] flex items-center justify-center overflow-hidden">
        {/* grid */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(128 128 128 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(128 128 128 / 0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* bloom */}
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-violet-500/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center text-center gap-8 px-6 py-24">
          {/* eyebrow */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs font-medium text-gray-400 shadow-sm">
            <span className="relative flex size-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-500 opacity-60" />
              <span className="relative inline-flex rounded-full size-1.5 bg-violet-500" />
            </span>
            AI-Powered CRO Analysis
          </div>

          {/* headline */}
          <div className="flex flex-col gap-5">
            <h1 className="text-6xl sm:text-7xl font-bold tracking-[-0.04em] leading-[1.02] text-white">
              Turn visitors<br />
              into{" "}
              <span className="bg-gradient-to-r from-violet-400 via-violet-300 to-blue-400 bg-clip-text text-transparent">
                customers.
              </span>
            </h1>
            <p className="text-base sm:text-[17px] text-gray-400 leading-relaxed max-w-[340px] mx-auto">
              Paste any URL and get a deep CRO audit across 6 conversion pillars in under 15 seconds.
            </p>
          </div>

          {/* pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {PILLS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-white/5 text-gray-400 border border-white/10 shadow-sm hover:text-white hover:border-white/20 transition-colors duration-150"
              >
                <Icon className="size-3.5 text-violet-400" strokeWidth={2.5} />
                {label}
              </span>
            ))}
          </div>

          {/* input */}
          <div className="w-full">
            <div className="relative w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-xl transition-all duration-200 has-[input:focus]:border-violet-500/50 has-[input:focus]:ring-4 has-[input:focus]:ring-violet-500/10">
              <form action="/results" method="GET" className="flex items-center p-2 gap-2">
                <div className="flex items-center flex-1 gap-3 pl-4 pr-2">
                  <svg className="size-4 shrink-0 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <input
                    name="url"
                    type="url"
                    placeholder="https://yoursite.com"
                    required
                    autoFocus
                    className="flex-1 h-11 bg-transparent text-sm text-white placeholder:text-gray-600 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="group inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 text-white text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(0,0,0,0.1)] hover:from-violet-600 hover:to-violet-700 active:scale-[0.97] transition-all duration-150 shrink-0 cursor-pointer whitespace-nowrap"
                >
                  Analyze
                  <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform duration-150" />
                </button>
              </form>
            </div>
            <p className="mt-3 text-[11px] text-gray-600 tracking-wide uppercase">
              Free · No credit card · Results in ~15 seconds
            </p>
          </div>
        </div>

        {/* scroll arrow */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-gray-600">
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </div>
      </section>

      <Divider />

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-28">
        <FadeIn className="flex flex-col items-center text-center gap-4 mb-16">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] text-white">
            From URL to action plan<br />in seconds
          </h2>
          <p className="text-gray-400 max-w-sm leading-relaxed">
            No setup. No learning curve. Just paste and go.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_STEPS.map(({ icon: Icon, step, title, desc }, i) => (
            <FadeIn key={step} delay={i * 0.1}>
              <div className="relative flex flex-col gap-5 rounded-2xl border border-white/8 bg-white/[0.03] p-7 h-full">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
                    <Icon className="size-4 text-violet-400" strokeWidth={1.75} />
                  </div>
                  <span className="text-[11px] font-bold tracking-widest text-gray-600 uppercase">
                    Step {step}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
                </div>
                {/* connector dot */}
                {i < 2 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-violet-500/40 ring-4 ring-violet-500/10 z-10" />
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── 6 PILLARS ─────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-28">
        <FadeIn className="flex flex-col items-center text-center gap-4 mb-16">
          <SectionLabel>The 6 pillars</SectionLabel>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] text-white">
            Every angle of conversion,<br />scored by AI
          </h2>
          <p className="text-gray-400 max-w-sm leading-relaxed">
            SiteIQ grades your site across the six factors that most directly drive revenue.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PILLARS.map(({ icon: Icon, name, desc }, i) => (
            <FadeIn key={name} delay={i * 0.07}>
              <div className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-6 h-full group hover:border-violet-500/30 hover:bg-violet-500/5 transition-colors duration-300">
                <div className="size-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors duration-300">
                  <Icon className="size-4.5 text-violet-400" strokeWidth={1.75} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-semibold text-white">{name}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── EXAMPLE REPORT ────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-28">
        <FadeIn className="flex flex-col items-center text-center gap-4 mb-16">
          <SectionLabel>Example report</SectionLabel>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] text-white">
            See what a real audit looks like
          </h2>
          <p className="text-gray-400 max-w-sm leading-relaxed">
            Here&apos;s a sample report for example.com — exactly what you get in 15 seconds.
          </p>
        </FadeIn>

        <FadeIn>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            {/* report header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-7 border-b border-white/8">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-400/10 border border-amber-400/25 flex items-center justify-center shrink-0">
                  <span className="text-2xl font-extrabold text-amber-400">B+</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">Audit report</p>
                  <p className="text-lg font-semibold text-white">example.com</p>
                  <p className="text-sm text-gray-400">Overall score: 79 / 100</p>
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                {EXAMPLE_PILLARS.map(({ name, score }) => (
                  <div key={name} className={cn("flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border text-center", scoreBg(score))}>
                    <span className={cn("text-lg font-bold", scoreColor(score))}>{score}</span>
                    <span className="text-[10px] text-gray-500 leading-tight max-w-[60px]">{name.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* pillar cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5">
              {EXAMPLE_PILLARS.map(({ name, score, fixes }) => (
                <div key={name} className="flex flex-col gap-4 p-6 bg-[#080808]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-white text-sm">{name}</span>
                    <span className={cn("text-sm font-bold tabular-nums", scoreColor(score))}>
                      {score}/10
                    </span>
                  </div>
                  {/* score bar */}
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full", scoreBar(score))}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${score * 10}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                    />
                  </div>
                  {/* fixes */}
                  <ul className="flex flex-col gap-2">
                    {fixes.map((fix) => (
                      <li key={fix} className="flex gap-2 text-[13px] text-gray-400 leading-relaxed">
                        <span className="mt-0.5 size-4 rounded-full bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0">
                          <span className="size-1.5 rounded-full bg-rose-400" />
                        </span>
                        {fix}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      <Divider />

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-28">
        <FadeIn className="flex flex-col items-center text-center gap-4 mb-16">
          <SectionLabel>Pricing</SectionLabel>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] text-white">
            Start free. Upgrade<br />when you&apos;re ready.
          </h2>
          <p className="text-gray-400 max-w-sm leading-relaxed">
            No trial expiry on the free tier. Upgrade only when you need more power.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan, i) => {
            const isPro = plan.variant === "pro";
            const isAgency = plan.variant === "agency";
            return (
              <FadeIn key={plan.name} delay={i * 0.1}>
                <div
                  className={cn(
                    "relative flex flex-col gap-6 rounded-2xl p-7 h-full border",
                    isPro
                      ? "border-violet-500/50 bg-violet-500/5 shadow-[0_0_40px_-8px_rgba(139,92,246,0.3)]"
                      : isAgency
                      ? "border-amber-400/30 bg-amber-500/5"
                      : "border-white/8 bg-white/[0.03]"
                  )}
                >
                  {isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-sm whitespace-nowrap">
                        Most popular
                      </span>
                    </div>
                  )}
                  {isAgency && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-amber-400 to-orange-400 text-black shadow-sm whitespace-nowrap">
                        ✦ Best value
                      </span>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">{plan.name}</p>
                    <div className="flex items-baseline gap-1 mb-1">
                      {plan.price ? (
                        <>
                          <span className="text-4xl font-extrabold text-white">${plan.price}</span>
                          <span className="text-gray-500 text-sm">/mo</span>
                        </>
                      ) : (
                        <span className="text-4xl font-extrabold text-white">Free</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">{plan.description}</p>
                  </div>

                  <ul className="flex-1 flex flex-col gap-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check
                          size={14}
                          className={cn(
                            "mt-0.5 shrink-0",
                            isAgency ? "text-amber-400" : isPro ? "text-violet-400" : "text-emerald-500"
                          )}
                        />
                        <span className="text-gray-300">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href={plan.href}
                    className={cn(
                      "inline-flex items-center justify-center h-11 rounded-xl text-sm font-semibold transition-all",
                      isAgency
                        ? "bg-gradient-to-r from-amber-400 to-orange-400 text-black hover:from-amber-300 hover:to-orange-300"
                        : isPro
                        ? "bg-gradient-to-b from-violet-500 to-violet-600 text-white hover:from-violet-600 hover:to-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                        : "border border-white/10 bg-white/5 hover:bg-white/10 text-white"
                    )}
                  >
                    {plan.cta}
                  </a>
                </div>
              </FadeIn>
            );
          })}
        </div>

        <FadeIn>
          <p className="text-center text-xs text-gray-600 mt-8">
            Payments powered by Stripe · Secure · Cancel any time
          </p>
        </FadeIn>
      </section>

      <Divider />

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-36 px-6">
        {/* bloom */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[300px] bg-violet-500/20 rounded-full blur-[100px]" />
        </div>

        <FadeIn className="relative z-10 flex flex-col items-center text-center gap-8 max-w-xl mx-auto">
          <h2 className="text-5xl sm:text-6xl font-bold tracking-[-0.04em] leading-[1.05] text-white">
            Ready to fix<br />
            <span className="bg-gradient-to-r from-violet-400 via-violet-300 to-blue-400 bg-clip-text text-transparent">
              your website?
            </span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed max-w-sm">
            Run your first free audit in under 15 seconds. No account needed.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="group inline-flex items-center gap-2 h-14 px-8 rounded-2xl bg-gradient-to-b from-violet-500 to-violet-600 text-white text-base font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_20px_60px_-12px_rgba(139,92,246,0.5)] hover:from-violet-600 hover:to-violet-700 active:scale-[0.97] transition-all duration-150 cursor-pointer"
          >
            Analyze your site
            <ChevronUp className="size-4 group-hover:-translate-y-0.5 transition-transform duration-150" />
          </button>
        </FadeIn>
      </section>

      {/* footer line */}
      <div className="border-t border-white/5 py-6 text-center text-xs text-gray-700">
        © {new Date().getFullYear()} SiteIQ · Built with AI · Powered by Claude
      </div>

    </div>
  );
}

function Divider() {
  return (
    <div className="max-w-5xl mx-auto px-6">
      <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
    </div>
  );
}
