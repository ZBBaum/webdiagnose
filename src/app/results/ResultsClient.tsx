"use client";

import { useEffect, useState } from "react";
import type { AuditResultV2, PillarResultV2, TopFix } from "@/lib/auditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SiteIQLogo from "@/components/SiteIQLogo";

/* ─── score helpers ──────────────────────────────────────── */

function scoreTheme(score: number) {
  if (score >= 8) return {
    headerBg: "bg-cyan-50 dark:bg-cyan-950/40",
    headerText: "text-cyan-800 dark:text-cyan-200",
    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",
    fill: "#06b6d4", label: score >= 9 ? "Excellent" : "Strong",
  };
  if (score >= 5) return {
    headerBg: "bg-blue-50 dark:bg-blue-950/40",
    headerText: "text-blue-800 dark:text-blue-200",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    fill: "#2563eb", label: score >= 7 ? "Fair" : "Weak",
  };
  return {
    headerBg: "bg-blue-100 dark:bg-[#1e3a8a]/30",
    headerText: "text-blue-900 dark:text-blue-300",
    badge: "bg-blue-200 text-blue-900 dark:bg-blue-950/80 dark:text-blue-400",
    fill: "#1e3a8a", label: "Critical",
  };
}

const GRADE_META: Record<string, { circle: string; badge: string }> = {
  A: { circle: "border-cyan-400 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",     badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300" },
  B: { circle: "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",     badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300" },
  C: { circle: "border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",     badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  D: { circle: "border-blue-700 bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400",    badge: "bg-blue-200 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400" },
  F: { circle: "border-blue-900 bg-blue-200 text-blue-900 dark:bg-blue-950/80 dark:text-blue-500",    badge: "bg-blue-200 text-blue-900 dark:bg-blue-950/80 dark:text-blue-500" },
};

const DIFFICULTY_META: Record<TopFix["difficulty"], { label: string; style: string }> = {
  easy:   { label: "Easy",   style: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300" },
  medium: { label: "Medium", style: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  hard:   { label: "Hard",   style: "bg-blue-200 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400" },
};

/* ─── loading view ───────────────────────────────────────── */

function LoadingView({ progress, statusMsg }: { progress: number; statusMsg: string }) {
  const [visible, setVisible] = useState(true);
  const [displayed, setDisplayed] = useState(statusMsg);

  useEffect(() => {
    if (statusMsg === displayed) return;
    setVisible(false);
    const t = setTimeout(() => {
      setDisplayed(statusMsg);
      setVisible(true);
    }, 220);
    return () => clearTimeout(t);
  }, [statusMsg, displayed]);

  return (
    <div className="min-h-[calc(100vh-76px)] flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-10 w-full max-w-xs text-center">
        <div className="flex flex-col items-center gap-3">
          <SiteIQLogo size={48} className="shadow-lg" />
          <span className="text-sm font-semibold text-foreground">SiteIQ</span>
        </div>
        <div className="w-full space-y-3.5">
          <h2 className="text-lg font-semibold text-foreground">Analyzing your site</h2>
          <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
            <div
              style={{
                width: `${progress}%`,
                backgroundColor: "#2563eb",
                transition: "width 0.4s ease",
                height: "100%",
                borderRadius: "9999px",
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

/* ─── pillar card ────────────────────────────────────────── */

function PillarCard({ pillar }: { pillar: PillarResultV2 }) {
  const t = scoreTheme(pillar.score);
  return (
    <Card className="p-0 gap-0 shadow-sm overflow-hidden">
      <div className={cn("px-5 pt-4 pb-3.5", t.headerBg)}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", t.headerText)}>
              {pillar.name}
            </p>
            <div className="flex items-baseline gap-0.5">
              <span className={cn("text-[2rem] font-extrabold leading-none", t.headerText)}>
                {pillar.score}
              </span>
              <span className={cn("text-sm font-medium opacity-60", t.headerText)}>/10</span>
            </div>
          </div>
          <span className={cn("mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0", t.badge)}>
            {t.label}
          </span>
        </div>
        <div className="mt-3 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pillar.score * 10}%`, background: t.fill }} />
        </div>
      </div>
      <CardContent className="pt-4 pb-5 space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">{pillar.summary}</p>
        {pillar.exactIssue && (
          <div className="rounded-md bg-muted/60 border border-border px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Issue Found</p>
            <p className="text-xs text-foreground leading-snug italic">&ldquo;{pillar.exactIssue}&rdquo;</p>
          </div>
        )}
        {pillar.rewrite && (
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1">Suggested Fix</p>
            <p className="text-xs text-foreground leading-snug">{pillar.rewrite}</p>
          </div>
        )}
        {pillar.benchmark && (
          <p className="text-[11px] text-muted-foreground">
            <span className="font-semibold">Benchmark:</span> {pillar.benchmark}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── results view ───────────────────────────────────────── */

function ResultsView({ audit, url }: { audit: AuditResultV2; url: string }) {
  const grade = audit.overallGrade ?? "F";
  const gradeMeta = GRADE_META[grade] ?? GRADE_META.F;

  const sorted = [...audit.pillars].sort((a, b) => b.score - a.score);
  const wins = sorted.filter((p) => p.score >= 7).slice(0, 3);
  const issues = sorted.filter((p) => p.score < 6).slice(0, 3);

  return (
    <div className="min-h-screen">

      {/* print-only header */}
      <div className="hidden print:flex items-center justify-between px-8 py-5 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <SiteIQLogo size={28} className="shrink-0" />
          <span className="text-sm font-semibold">SiteIQ Audit Report</span>
        </div>
        <span className="text-xs text-gray-500 truncate max-w-sm">{url}</span>
      </div>

      {/* sticky summary bar */}
      <div className="sticky top-[76px] z-40 bg-background/90 backdrop-blur-sm border-b border-border print:hidden">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className={cn("shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold border", gradeMeta.badge)}>
              {grade}
            </span>
            <span className="text-sm text-muted-foreground truncate hidden sm:block">{url}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              New audit
            </a>
            <Button
              variant="outline"
              size="sm"
              className="text-xs cursor-pointer"
              onClick={() => {
                const html = document.documentElement;
                const wasDark = html.classList.contains("dark");
                if (wasDark) html.classList.remove("dark");
                window.print();
                if (wasDark) html.classList.add("dark");
              }}
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
                  {grade}
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-1">
                  Overall Grade
                </p>
                <p className="text-xs text-muted-foreground text-center break-all max-w-[220px] leading-relaxed">
                  {url}
                </p>
              </CardContent>
            </Card>

            {/* classification */}
            {audit.classification && (
              <Card className="shadow-sm">
                <CardContent className="pt-5 pb-5 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Site Profile</p>
                  {[
                    { label: "Type", val: audit.classification.siteType },
                    { label: "Audience", val: audit.classification.targetCustomer },
                    { label: "Goal", val: audit.classification.primaryGoal },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <p className="text-xs font-medium text-foreground">{val}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* pillar bar chart */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pillar Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 pb-5">
                {sorted.map(({ name, score }) => {
                  const t = scoreTheme(score);
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{name}</span>
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
                    <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-2.5">Wins</p>
                    <div className="space-y-1.5">
                      {wins.map(({ name, score }) => (
                        <div key={name} className="flex items-center justify-between">
                          <span className="text-xs text-foreground">{name}</span>
                          <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">{score}/10</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {wins.length > 0 && issues.length > 0 && <hr className="border-border" />}
                {issues.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400 mb-2.5">Critical Issues</p>
                    <div className="space-y-1.5">
                      {issues.map(({ name, score }) => (
                        <div key={name} className="flex items-center justify-between">
                          <span className="text-xs text-foreground">{name}</span>
                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">{score}/10</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </aside>

          {/* main content */}
          <div className="space-y-6">

            {/* 5-second test */}
            {audit.fiveSecondTest && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">5-Second Test</CardTitle>
                  <p className="text-xs text-muted-foreground">First-time visitor impression</p>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5">
                  {(["whatItDoes", "whoItsFor", "whatToDo"] as const).map((key) => {
                    const item = audit.fiveSecondTest[key];
                    const t = scoreTheme(item.score);
                    const label = key === "whatItDoes" ? "What It Does" : key === "whoItsFor" ? "Who It's For" : "What To Do";
                    return (
                      <div key={key} className={cn("rounded-lg p-4", t.headerBg)}>
                        <div className="flex items-center justify-between mb-2">
                          <p className={cn("text-[10px] font-bold uppercase tracking-widest", t.headerText)}>{label}</p>
                          <span className={cn("px-1.5 py-0.5 rounded-full text-[11px] font-bold", t.badge)}>{item.score}/10</span>
                        </div>
                        {item.quote && (
                          <p className="text-xs italic text-muted-foreground mb-1.5">&ldquo;{item.quote}&rdquo;</p>
                        )}
                        <p className="text-xs text-foreground leading-snug">{item.finding}</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* top fixes */}
            {audit.topFixes?.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Top Fixes by Revenue Impact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pb-5">
                  {audit.topFixes.map((fix, i) => {
                    const d = DIFFICULTY_META[fix.difficulty] ?? DIFFICULTY_META.medium;
                    return (
                      <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-muted/40 border border-border">
                        <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium leading-snug">{fix.fix}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-snug">{fix.impact}</p>
                        </div>
                        <span className={cn("shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold", d.style)}>
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* revenue impact */}
            {audit.revenueImpact && (
              <div className="rounded-lg border border-cyan-300 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/30 px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-1.5">Revenue Opportunity</p>
                <p className="text-sm text-foreground leading-relaxed">{audit.revenueImpact}</p>
              </div>
            )}

            {/* pillar cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {audit.pillars.map((pillar) => (
                <PillarCard key={pillar.name} pillar={pillar} />
              ))}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

/* ─── main export ────────────────────────────────────────── */

export default function ResultsClient({ url }: { url: string }) {
  const [phase, setPhase] = useState<"loading" | "results" | "error">("loading");
  const [audit, setAudit] = useState<AuditResultV2 | null>(null);
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
        if (!cancelled) { setErrorMsg((data as { error?: string }).error ?? `Request failed (${res.status})`); setPhase("error"); }
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
          let msg: { type: string; message?: string; data?: AuditResultV2; count?: number };
          try { msg = JSON.parse(line.slice(6)); } catch { continue; }

          if (msg.type === "progress") {
            setStatusMsg(msg.message ?? "Analyzing…");
            setProgress((p) => Math.min(p + 30, 85));
          } else if (msg.type === "result" && msg.data) {
            setProgress(100);
            setTimeout(() => {
              if (!cancelled) { setAudit(msg.data!); setPhase("results"); }
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
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">X</div>
          <h2 className="text-lg font-semibold">Audit failed</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{errorMsg}</p>
          <a href="/" className="text-sm text-blue-500 hover:underline">Try another URL</a>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return <LoadingView progress={progress} statusMsg={statusMsg} />;
  }

  return <ResultsView audit={audit!} url={url} />;
}
