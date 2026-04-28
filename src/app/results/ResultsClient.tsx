"use client";

import { useEffect, useState } from "react";
import type { AuditResult, PillarResult } from "@/lib/auditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SiteIQLogo from "@/components/SiteIQLogo";

/* ─── constants ──────────────────────────────────────────── */

const MESSAGES = [
  "Scraping your page content…",
  "Analyzing trust signals…",
  "Checking CTA strength…",
  "Evaluating copy tone…",
  "Detecting friction points…",
  "Generating recommendations…",
];

const PILLAR_LABELS: Record<keyof AuditResult["pillars"], string> = {
  valuePropClarity: "Value Proposition",
  ctaStrength: "CTA Strength",
  trustSignals: "Trust Signals",
  copyTone: "Copy & Tone",
  frictionDetection: "Friction Detection",
  mobileAccessibility: "Mobile & Accessibility",
};

const GRADE_META: Record<string, { circle: string; badge: string }> = {
  A: { circle: "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" },
  B: { circle: "border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",               badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  C: { circle: "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",          badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  D: { circle: "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",     badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
  F: { circle: "border-red-400 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",                    badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
};

/* ─── score helpers ──────────────────────────────────────── */

function scoreTheme(score: number) {
  if (score >= 8) return {
    headerBg: "bg-emerald-50 dark:bg-emerald-950/40",
    headerText: "text-emerald-800 dark:text-emerald-200",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    fill: "#059669", label: "Strong",
  };
  if (score >= 5) return {
    headerBg: "bg-amber-50 dark:bg-amber-950/40",
    headerText: "text-amber-800 dark:text-amber-200",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    fill: "#d97706", label: "Fair",
  };
  return {
    headerBg: "bg-red-50 dark:bg-red-950/40",
    headerText: "text-red-800 dark:text-red-200",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    fill: "#dc2626", label: "Weak",
  };
}

/* ─── loading view ───────────────────────────────────────── */

function LoadingView({ progress }: { progress: number }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIdx((i) => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 220);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center px-6 bg-background">
      <div className="flex flex-col items-center gap-10 w-full max-w-xs text-center">

        {/* logo */}
        <div className="flex flex-col items-center gap-3">
          <SiteIQLogo size={48} className="shadow-lg" />
          <span className="text-sm font-semibold text-foreground">SiteIQ</span>
        </div>

        {/* progress */}
        <div className="w-full space-y-3.5">
          <h2 className="text-lg font-semibold text-foreground">Analyzing your site</h2>

          <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
            <div
              style={{
                width: `${progress}%`,
                backgroundColor: "#7c3aed",
                transition: "width 0.15s ease",
                height: "100%",
                borderRadius: "9999px",
              }}
            />
          </div>

          <p
            className="text-sm text-muted-foreground transition-opacity duration-200"
            style={{ opacity: visible ? 1 : 0 }}
          >
            {MESSAGES[msgIdx]}
          </p>
        </div>

      </div>
    </div>
  );
}

/* ─── pillar card ────────────────────────────────────────── */

function PillarCard({ name, result }: { name: string; result: PillarResult }) {
  const t = scoreTheme(result.score);
  return (
    <Card className="p-0 gap-0 shadow-sm overflow-hidden">
      <div className={cn("px-5 pt-4 pb-3.5", t.headerBg)}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", t.headerText)}>
              {name}
            </p>
            <div className="flex items-baseline gap-0.5">
              <span className={cn("text-[2rem] font-extrabold leading-none", t.headerText)}>
                {result.score}
              </span>
              <span className={cn("text-sm font-medium opacity-60", t.headerText)}>/10</span>
            </div>
          </div>
          <span className={cn("mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0", t.badge)}>
            {t.label}
          </span>
        </div>
        <div className="mt-3 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${result.score * 10}%`, background: t.fill }} />
        </div>
      </div>
      <CardContent className="pt-4 pb-5">
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{result.summary}</p>
        <ol className="space-y-2.5">
          {result.fixes.map((fix, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                {i + 1}
              </span>
              <span className="text-foreground leading-snug">{fix}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

/* ─── results view ───────────────────────────────────────── */

function ResultsView({ audit, url }: { audit: AuditResult; url: string }) {
  const gradeKeys = Object.keys(audit.pillars) as Array<keyof AuditResult["pillars"]>;
  const gradeMeta = GRADE_META[audit.grade] ?? GRADE_META.F;

  const sorted = gradeKeys
    .map((k) => ({ key: k, label: PILLAR_LABELS[k], score: audit.pillars[k].score }))
    .sort((a, b) => b.score - a.score);

  const wins = sorted.filter((p) => p.score >= 7).slice(0, 3);
  const issues = sorted.filter((p) => p.score < 6).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">

      {/* print-only header */}
      <div className="hidden print:flex items-center justify-between px-8 py-5 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <SiteIQLogo size={28} className="shrink-0" />
          <span className="text-sm font-semibold">SiteIQ Audit Report</span>
        </div>
        <span className="text-xs text-gray-500 truncate max-w-sm">{url}</span>
      </div>

      {/* sticky summary bar */}
      <div className="sticky top-[60px] z-40 bg-background/90 backdrop-blur-sm border-b border-border print:hidden">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className={cn("shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold border", gradeMeta.badge)}>
              {audit.grade}
            </span>
            <span className="text-sm text-muted-foreground truncate hidden sm:block">{url}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              ← New audit
            </a>
            <Button
              variant="outline"
              size="sm"
              className="text-xs cursor-pointer"
              onClick={() => window.print()}
            >
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* main layout */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">

          {/* sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-[114px]">

            {/* grade card */}
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center gap-2 py-6">
                <div className={cn("w-20 h-20 rounded-full border-2 flex items-center justify-center text-[2.25rem] font-extrabold", gradeMeta.circle)}>
                  {audit.grade}
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-1">
                  Overall Grade
                </p>
                <p className="text-xs text-muted-foreground text-center break-all max-w-[220px] leading-relaxed">
                  {url}
                </p>
              </CardContent>
            </Card>

            {/* pillar bar chart */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pillar Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 pb-5">
                {sorted.map(({ label, score }) => {
                  const t = scoreTheme(score);
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className="text-xs font-semibold tabular-nums">{score}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${score * 10}%`, background: t.fill }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* wins & issues */}
            <Card className="shadow-sm">
              <CardContent className="pt-5 pb-5 space-y-5">
                {wins.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-2.5">✓ Key Wins</p>
                    <div className="space-y-1.5">
                      {wins.map(({ label, score }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-xs text-foreground">{label}</span>
                          <span className="text-xs font-semibold text-emerald-600">{score}/10</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {wins.length > 0 && issues.length > 0 && <hr className="border-border" />}
                {issues.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-700 mb-2.5">⚠ Critical Issues</p>
                    <div className="space-y-1.5">
                      {issues.map(({ label, score }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-xs text-foreground">{label}</span>
                          <span className="text-xs font-semibold text-red-600">{score}/10</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </aside>

          {/* pillar cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gradeKeys.map((key) => (
              <PillarCard key={key} name={PILLAR_LABELS[key]} result={audit.pillars[key]} />
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─── main export ────────────────────────────────────────── */

export default function ResultsClient({ url }: { url: string }) {
  const [phase, setPhase] = useState<"loading" | "results" | "error">("loading");
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) { clearInterval(id); return p; }
        return p + 1;
      });
    }, 150);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch(`/api/audit?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((data: AuditResult & { error?: string }) => {
        if (data.error) {
          setErrorMsg(data.error);
          setPhase("error");
          return;
        }
        setProgress(100);
        setTimeout(() => {
          setAudit(data);
          setPhase("results");
        }, 650);
      })
      .catch((err: Error) => {
        setErrorMsg(err.message);
        setPhase("error");
      });
  }, [url]);

  if (phase === "error") {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">✕</div>
          <h2 className="text-lg font-semibold">Audit failed</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{errorMsg}</p>
          <a href="/" className="text-sm text-violet-600 hover:underline">← Try another URL</a>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return <LoadingView progress={progress} />;
  }

  return <ResultsView audit={audit!} url={url} />;
}
