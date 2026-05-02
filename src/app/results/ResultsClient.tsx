"use client";

import { useEffect, useRef, useState } from "react";
import type { AuditResultV2, PillarResultV2, TopFix, VisualAnnotation } from "@/lib/auditor";
import { cn } from "@/lib/utils";
import SiteIQLogo from "@/components/SiteIQLogo";

/* ── score helpers ──────────────────────────────────────────── */

function sc(score: number) {
  if (score >= 8) return {
    tier: "high" as const,
    hex: "#06b6d4",
    cls: "text-cyan-500 dark:text-cyan-400",
    bgCls: "bg-cyan-50 dark:bg-cyan-950/40",
    borderCls: "border-cyan-200 dark:border-cyan-800",
    label: score >= 9 ? "Excellent" : "Strong",
  };
  if (score >= 5) return {
    tier: "mid" as const,
    hex: "#2563eb",
    cls: "text-blue-600 dark:text-blue-400",
    bgCls: "bg-blue-50 dark:bg-blue-950/30",
    borderCls: "border-blue-200 dark:border-blue-800",
    label: score >= 7 ? "Fair" : "Weak",
  };
  return {
    tier: "low" as const,
    hex: "#1e3a8a",
    cls: "text-blue-900 dark:text-blue-300",
    bgCls: "bg-blue-100 dark:bg-[#1e3a8a]/30",
    borderCls: "border-blue-300 dark:border-blue-700",
    label: "Critical",
  };
}

const GRADE_RING: Record<string, string> = {
  A: "#06b6d4", B: "#2563eb", C: "#3b82f6", D: "#1d4ed8", F: "#1e3a8a",
};

const DIFFICULTY: Record<string, { label: string; cls: string }> = {
  easy:   { label: "Easy",   cls: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
  medium: { label: "Medium", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  hard:   { label: "Hard",   cls: "bg-blue-200 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200" },
};

const ANN_TYPE: Record<VisualAnnotation["type"], { border: string; bg: string; badge: string; dot: string }> = {
  critical: { border: "rgba(239,68,68,0.85)",  bg: "rgba(239,68,68,0.1)",  badge: "#ef4444", dot: "bg-red-500" },
  warning:  { border: "rgba(251,191,36,0.85)", bg: "rgba(251,191,36,0.1)", badge: "#f59e0b", dot: "bg-amber-400" },
  good:     { border: "rgba(34,197,94,0.85)",  bg: "rgba(34,197,94,0.1)",  badge: "#22c55e", dot: "bg-green-500" },
};

/* ── loading view ───────────────────────────────────────────── */

function LoadingView({ progress, statusMsg }: { progress: number; statusMsg: string }) {
  const [visible, setVisible] = useState(true);
  const [displayed, setDisplayed] = useState(statusMsg);

  useEffect(() => {
    if (statusMsg === displayed) return;
    setVisible(false);
    const t = setTimeout(() => { setDisplayed(statusMsg); setVisible(true); }, 220);
    return () => clearTimeout(t);
  }, [statusMsg, displayed]);

  return (
    <div className="min-h-[calc(100vh-76px)] flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-10 w-full max-w-xs text-center">
        <div className="flex flex-col items-center gap-3">
          <SiteIQLogo size={48} className="shadow-lg" />
          <span className="text-sm font-semibold tracking-tight">SiteIQ</span>
        </div>
        <div className="w-full space-y-3.5">
          <h2 className="text-lg font-semibold">Analyzing your site</h2>
          <div className="w-full h-[3px] rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg,#2563eb,#06b6d4)",
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <p
            className="text-sm text-muted-foreground transition-opacity duration-200"
            style={{ opacity: visible ? 1 : 0 }}
          >
            {displayed}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── section heading ────────────────────────────────────────── */

function SectionHeading({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div
        data-print="section-num"
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white mt-0.5"
        style={{ background: "linear-gradient(135deg,#2563eb,#06b6d4)" }}
      >
        {number}
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ── annotated screenshot viewer ────────────────────────────── */

function AnnotatedScreenshot({
  screenshot,
  annotations,
}: {
  screenshot: string;
  annotations: VisualAnnotation[];
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-3">
      {/* scrollable viewer */}
      <div
        className="relative w-full rounded-xl border border-border overflow-auto bg-black/5 print:overflow-visible"
        style={{ maxHeight: "600px" }}
      >
        <div ref={containerRef} className="relative inline-block w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${screenshot}`}
            alt="Page screenshot"
            className="w-full h-auto block select-none"
            draggable={false}
          />

          {/* annotation overlays */}
          {annotations.map((ann, i) => {
            const s = ANN_TYPE[ann.type] ?? ANN_TYPE.warning;
            const isActive = activeIdx === i;

            /* decide whether tooltip should open upward */
            const tooltipUp = ann.y > 60;

            return (
              <div
                key={i}
                className="absolute cursor-pointer"
                style={{
                  left: `${ann.x}%`,
                  top: `${ann.y}%`,
                  width: `${ann.width}%`,
                  height: `${ann.height}%`,
                  border: `2px solid ${s.border}`,
                  background: s.bg,
                  zIndex: isActive ? 30 : 10,
                }}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                {/* label badge — always visible */}
                <span
                  className="absolute top-0 left-0 px-1.5 py-[2px] text-[10px] font-bold text-white leading-tight whitespace-nowrap rounded-br"
                  style={{ background: s.badge, maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {ann.label}
                </span>

                {/* tooltip — on hover */}
                {isActive && (
                  <div
                    className="absolute z-50 rounded-lg shadow-xl pointer-events-none"
                    style={{
                      background: "#111827",
                      color: "white",
                      padding: "8px 12px",
                      minWidth: "200px",
                      maxWidth: "280px",
                      [tooltipUp ? "bottom" : "top"]: "calc(100% + 6px)",
                      left: 0,
                    }}
                  >
                    <p className="text-[11px] font-bold mb-0.5" style={{ color: s.badge }}>{ann.label}</p>
                    <p className="text-xs leading-snug opacity-90">{ann.description}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* annotation legend */}
      {annotations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {annotations.map((ann, i) => {
            const s = ANN_TYPE[ann.type] ?? ANN_TYPE.warning;
            return (
              <button
                key={i}
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors"
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", s.dot)} />
                {ann.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── five-second card ───────────────────────────────────────── */

function FiveSecondCard({
  label, score, quote, finding,
}: { label: string; score: number; quote: string; finding: string }) {
  const s = sc(score);
  return (
    <div className={cn("rounded-xl border p-5 flex flex-col gap-3 break-inside-avoid", s.bgCls, s.borderCls)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-0.5">
          <span
            data-score-tier={s.tier}
            className={cn("text-2xl font-extrabold leading-none tabular-nums", s.cls)}
          >
            {score}
          </span>
          <span className="text-xs font-medium text-muted-foreground">/10</span>
        </div>
      </div>

      <div className="h-[3px] rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div
          data-bar-fill={s.tier}
          className="h-full rounded-full"
          style={{ width: `${score * 10}%`, background: s.hex }}
        />
      </div>

      {quote && (
        <blockquote
          data-print="issue-quote"
          className="border-l-2 pl-3 italic text-xs text-foreground leading-relaxed"
          style={{ borderColor: s.hex }}
        >
          &ldquo;{quote}&rdquo;
        </blockquote>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">{finding}</p>
    </div>
  );
}

/* ── top fix card ───────────────────────────────────────────── */

function FixCard({ index, fix }: { index: number; fix: TopFix }) {
  const d = DIFFICULTY[fix.difficulty] ?? DIFFICULTY.medium;
  return (
    <div className="flex gap-4 items-start rounded-xl border border-border bg-card px-5 py-4 break-inside-avoid">
      <div
        data-print="fix-num"
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold text-white"
        style={{ background: "linear-gradient(135deg,#2563eb,#06b6d4)" }}
      >
        {index + 1}
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm font-semibold text-foreground leading-snug">{fix.fix}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{fix.impact}</p>
      </div>
      <span
        data-difficulty={fix.difficulty}
        className={cn("shrink-0 self-start mt-0.5 px-2.5 py-1 rounded-full text-[11px] font-semibold", d.cls)}
      >
        {d.label}
      </span>
    </div>
  );
}

/* ── pillar card ────────────────────────────────────────────── */

function PillarCard({ pillar }: { pillar: PillarResultV2 }) {
  const s = sc(pillar.score);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col break-inside-avoid">
      <div className={cn("px-5 py-4 flex items-start justify-between gap-3", s.bgCls)}>
        <div>
          <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1.5", s.cls)}>
            {pillar.name}
          </p>
          <div className="flex items-baseline gap-1">
            <span
              data-score-tier={s.tier}
              className={cn("text-[2.25rem] font-extrabold leading-none tabular-nums", s.cls)}
            >
              {pillar.score}
            </span>
            <span className="text-sm text-muted-foreground font-medium">/10</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-semibold border", s.bgCls, s.cls, s.borderCls)}>
            {s.label}
          </span>
          <div className="w-20 h-[3px] rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              data-bar-fill={s.tier}
              className="h-full rounded-full"
              style={{ width: `${pillar.score * 10}%`, background: s.hex }}
            />
          </div>
        </div>
      </div>

      <div className="px-5 py-3.5 border-b border-border">
        <p className="text-sm text-muted-foreground leading-relaxed">{pillar.summary}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border flex-1">
        <div className="px-4 py-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Issue Found</p>
          {pillar.exactIssue ? (
            <blockquote
              data-print="issue-quote"
              className="border-l-2 border-blue-300 dark:border-blue-700 pl-3 text-xs italic text-foreground leading-relaxed"
            >
              &ldquo;{pillar.exactIssue}&rdquo;
            </blockquote>
          ) : (
            <p className="text-xs text-muted-foreground italic">No specific issue identified.</p>
          )}
        </div>

        <div data-print="rewrite-panel" className="px-4 py-4 space-y-2 bg-cyan-50/60 dark:bg-cyan-950/20">
          <p
            data-print="rewrite-label"
            className="text-[10px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400"
          >
            Suggested Rewrite
          </p>
          <p className="text-xs text-foreground leading-relaxed">{pillar.rewrite || "—"}</p>
        </div>
      </div>

      {pillar.benchmark && (
        <div className="px-5 py-2.5 border-t border-border bg-muted/30">
          <p className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Benchmark:</span>{" "}
            {pillar.benchmark}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── results view ───────────────────────────────────────────── */

function ResultsView({
  audit,
  url,
  screenshot,
}: {
  audit: AuditResultV2;
  url: string;
  screenshot: string | null;
}) {
  const grade = (audit.overallGrade ?? "F").toUpperCase();
  const gradeRing = GRADE_RING[grade] ?? "#1e3a8a";
  const hasAnnotations = screenshot && (audit.visualAnnotations?.length ?? 0) > 0;

  return (
    <div className="min-h-screen print:min-h-0">

      {/* print header */}
      <div className="hidden print:flex items-center justify-between px-8 py-4 border-b border-gray-200 mb-4">
        <div className="flex items-center gap-2.5">
          <SiteIQLogo size={22} />
          <span className="text-sm font-bold">SiteIQ</span>
          <span className="text-gray-300 mx-1.5">|</span>
          <span className="text-xs text-gray-500">Conversion Audit Report</span>
        </div>
        <span className="text-xs text-gray-400 truncate max-w-xs">{url}</span>
      </div>

      {/* sticky action bar */}
      <div className="sticky top-[76px] z-40 bg-background/90 backdrop-blur-sm border-b border-border print:hidden">
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="shrink-0 w-6 h-6 rounded-full border-[2px] flex items-center justify-center text-[11px] font-extrabold"
              style={{ borderColor: gradeRing, color: gradeRing }}
            >
              {grade}
            </span>
            <span className="text-sm text-muted-foreground truncate hidden sm:block">{url}</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              New audit
            </a>
            <button
              className="text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors font-medium cursor-pointer"
              onClick={() => window.print()}
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* report header */}
      <div className="border-b border-border bg-muted/20 print:bg-transparent print:border-b print:border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-8 print:py-5">
          <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8">
            <div className="shrink-0 flex flex-col items-center gap-1.5">
              <div
                data-grade={grade}
                className="w-20 h-20 rounded-full border-[3px] flex items-center justify-center text-4xl font-extrabold"
                style={{ borderColor: gradeRing, color: gradeRing }}
              >
                {grade}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Overall Grade
              </p>
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                  Audited Site
                </p>
                <p className="text-sm font-medium text-foreground">{url}</p>
              </div>

              {audit.classification && (
                <div className="flex flex-wrap gap-2">
                  {[
                    audit.classification.siteType,
                    audit.classification.targetCustomer,
                    audit.classification.primaryGoal,
                  ].filter(Boolean).map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {audit.revenueImpact && (
                <div
                  data-print="revenue"
                  className="flex items-start gap-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 px-4 py-3 max-w-xl"
                >
                  <svg
                    data-print="revenue-icon"
                    className="shrink-0 mt-0.5 w-4 h-4 text-cyan-500"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs font-medium text-cyan-900 dark:text-cyan-200 leading-relaxed">
                    {audit.revenueImpact}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* body */}
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-14 print:space-y-10 print:py-6">

        {/* 01 — visual analysis */}
        {hasAnnotations && (
          <section className="print:hidden">
            <SectionHeading
              number="01"
              title="Visual Analysis"
              subtitle="Annotated screenshot — hover any box to see the finding"
            />
            <AnnotatedScreenshot
              screenshot={screenshot!}
              annotations={audit.visualAnnotations}
            />
          </section>
        )}

        {/* 02 — five-second test */}
        {audit.fiveSecondTest && (
          <section>
            <SectionHeading
              number={hasAnnotations ? "02" : "01"}
              title="Five-Second Test"
              subtitle="What a first-time visitor understands in their first 5 seconds on the page"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FiveSecondCard
                label="What It Does"
                score={audit.fiveSecondTest.whatItDoes.score}
                quote={audit.fiveSecondTest.whatItDoes.quote}
                finding={audit.fiveSecondTest.whatItDoes.finding}
              />
              <FiveSecondCard
                label="Who It's For"
                score={audit.fiveSecondTest.whoItsFor.score}
                quote={audit.fiveSecondTest.whoItsFor.quote}
                finding={audit.fiveSecondTest.whoItsFor.finding}
              />
              <FiveSecondCard
                label="What To Do"
                score={audit.fiveSecondTest.whatToDo.score}
                quote={audit.fiveSecondTest.whatToDo.quote}
                finding={audit.fiveSecondTest.whatToDo.finding}
              />
            </div>
          </section>
        )}

        {/* 03 — top 3 revenue opportunities */}
        {(audit.topFixes?.length ?? 0) > 0 && (
          <section>
            <SectionHeading
              number={hasAnnotations ? "03" : "02"}
              title="Top 3 Revenue Opportunities"
              subtitle="Ranked by estimated conversion impact — fix these first"
            />
            <div className="space-y-3">
              {audit.topFixes.map((fix, i) => (
                <FixCard key={i} index={i} fix={fix} />
              ))}
            </div>
          </section>
        )}

        {/* 04 — pillar analysis */}
        {(audit.pillars?.length ?? 0) > 0 && (
          <section>
            <SectionHeading
              number={hasAnnotations ? "04" : "03"}
              title="Pillar Analysis"
              subtitle="Six dimensions of conversion performance — exact issue identified and rewrite provided for each"
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {audit.pillars.map((pillar) => (
                <PillarCard key={pillar.name} pillar={pillar} />
              ))}
            </div>
          </section>
        )}

      </div>

      {/* print footer */}
      <div className="hidden print:block px-8 py-4 border-t border-gray-200 mt-8">
        <p className="text-[10px] text-gray-400 text-center">
          Generated by SiteIQ &middot; siteiqai.com &middot;{" "}
          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

    </div>
  );
}

/* ── main export ────────────────────────────────────────────── */

export default function ResultsClient({ url }: { url: string }) {
  const [phase, setPhase] = useState<"loading" | "results" | "error">("loading");
  const [audit, setAudit] = useState<AuditResultV2 | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(5);
  const [statusMsg, setStatusMsg] = useState("Connecting…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      let res: Response;
      try {
        res = await fetch(`/api/audit?url=${encodeURIComponent(url)}`);
      } catch {
        if (!cancelled) { setErrorMsg("Network error — could not reach the server."); setPhase("error"); }
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          setErrorMsg((data as { error?: string }).error ?? `Request failed (${res.status})`);
          setPhase("error");
        }
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done || cancelled) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const line = chunk.trim();
          if (!line.startsWith("data: ")) continue;
          let msg: { type: string; message?: string; data?: AuditResultV2; screenshot?: string | null };
          try { msg = JSON.parse(line.slice(6)); } catch { continue; }

          if (msg.type === "progress") {
            setStatusMsg(msg.message ?? "Analyzing…");
            setProgress((p) => Math.min(p + 30, 85));
          } else if (msg.type === "result" && msg.data) {
            setProgress(100);
            const capturedScreenshot = msg.screenshot ?? null;
            setTimeout(() => {
              if (!cancelled) {
                setAudit(msg.data!);
                setScreenshot(capturedScreenshot);
                setPhase("results");
              }
            }, 500);
          } else if (msg.type === "error") {
            if (!cancelled) { setErrorMsg(msg.message ?? "Audit failed"); setPhase("error"); }
          }
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [url]);

  if (phase === "error") {
    return (
      <div className="min-h-[calc(100vh-76px)] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 font-bold text-xl">
            ×
          </div>
          <h2 className="text-lg font-semibold">Audit failed</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{errorMsg}</p>
          <a href="/" className="text-sm text-blue-500 hover:underline">← Try another URL</a>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return <LoadingView progress={progress} statusMsg={statusMsg} />;
  }

  return <ResultsView audit={audit!} url={url} screenshot={screenshot} />;
}
