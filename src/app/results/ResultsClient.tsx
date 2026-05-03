"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AuditResultV2, PillarResultV2, TopFix, VisualAnnotation } from "@/lib/auditor";
import { cn } from "@/lib/utils";
import SiteIQLogo from "@/components/SiteIQLogo";
import { AnimatedBlobs } from "@/components/ui/blobs";

/* ── multi-page types ───────────────────────────────────────── */

type PageResult = { url: string; audit: AuditResultV2; screenshot: string | null };

/* ── score helpers ──────────────────────────────────────────── */

function getScoreColor(score: number): string {
  if (score >= 9) return "#06b6d4";
  if (score >= 7) return "#10b981";
  if (score >= 5) return "#f59e0b";
  if (score >= 3) return "#f97316";
  return "#dc2626";
}

function getScoreLabel(score: number): string {
  if (score >= 9) return "Best in class";
  if (score >= 7) return "Strong";
  if (score >= 5) return "Needs work";
  if (score >= 3) return "Weak";
  return "Priority fix";
}

function sc(score: number) {
  if (score >= 9) return {
    tier: "best" as const, hex: "#06b6d4",
    cls: "text-cyan-400",
    bgCls: "bg-cyan-950/30",
    borderCls: "border-cyan-800/60",
    label: getScoreLabel(score),
  };
  if (score >= 7) return {
    tier: "strong" as const, hex: "#10b981",
    cls: "text-emerald-400",
    bgCls: "bg-emerald-950/30",
    borderCls: "border-emerald-800/60",
    label: getScoreLabel(score),
  };
  if (score >= 5) return {
    tier: "needs" as const, hex: "#f59e0b",
    cls: "text-amber-400",
    bgCls: "bg-amber-950/30",
    borderCls: "border-amber-800/60",
    label: getScoreLabel(score),
  };
  if (score >= 3) return {
    tier: "weak" as const, hex: "#f97316",
    cls: "text-orange-400",
    bgCls: "bg-orange-950/30",
    borderCls: "border-orange-800/60",
    label: getScoreLabel(score),
  };
  return {
    tier: "critical" as const, hex: "#dc2626",
    cls: "text-red-500",
    bgCls: "bg-red-950/30",
    borderCls: "border-red-800/60",
    label: getScoreLabel(score),
  };
}

const GRADE_RING: Record<string, string> = {
  A: "#06b6d4",
  B: "#10b981",
  C: "#f59e0b",
  D: "#f97316",
  F: "#dc2626",
};

const DIFFICULTY: Record<string, { label: string; cls: string }> = {
  easy:   { label: "Easy",   cls: "bg-cyan-950/50 text-cyan-300 border border-cyan-800/60" },
  medium: { label: "Medium", cls: "bg-amber-950/50 text-amber-300 border border-amber-800/60" },
  hard:   { label: "Hard",   cls: "bg-red-950/50 text-red-400 border border-red-800/60" },
};

/* ── annotation type colors ─────────────────────────────────── */

const ANN_TYPE: Record<VisualAnnotation["type"], { border: string; badge: string; dot: string }> = {
  critical: { border: "#dc2626", badge: "#dc2626", dot: "bg-red-500" },
  warning:  { border: "#f59e0b", badge: "#f59e0b", dot: "bg-amber-400" },
  good:     { border: "#06b6d4", badge: "#06b6d4", dot: "bg-cyan-500" },
};

/* ── annotation overlap resolution ─────────────────────────── */

function boxesOverlap(a: VisualAnnotation, b: VisualAnnotation): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function resolveAnnotationOverlaps(anns: VisualAnnotation[]): VisualAnnotation[] {
  const result = anns.map(a => ({ ...a }));
  for (let i = 1; i < result.length; i++) {
    for (let j = 0; j < i; j++) {
      let tries = 0;
      while (boxesOverlap(result[i], result[j]) && tries < 8) {
        result[i] = { ...result[i], y: Math.min(result[i].y + 3, 95 - result[i].height) };
        tries++;
      }
    }
  }
  return result;
}

/* ── inline cross-reference badge ───────────────────────────── */

function AnnBadge({ number, type }: { number: number; type: VisualAnnotation["type"] }) {
  const s = ANN_TYPE[type];
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0"
      style={{ width: 17, height: 17, fontSize: 10, lineHeight: 1, background: s.badge }}
      title={`See annotation ${number} in the visual analysis above`}
    >
      {number}
    </span>
  );
}

/* ── canvas download ────────────────────────────────────────── */

async function downloadAnnotated(
  screenshot: string,
  annotations: VisualAnnotation[],
  pageUrl: string,
  onDone: () => void,
) {
  const img = new Image();
  img.onload = () => {
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    annotations.forEach((ann, i) => {
      const s = ANN_TYPE[ann.type] ?? ANN_TYPE.warning;
      const x = (ann.x / 100) * W;
      const y = (ann.y / 100) * H;
      const w = (ann.width / 100) * W;
      const h = (ann.height / 100) * H;

      // border only, no fill — rounded corners
      ctx.strokeStyle = s.badge;
      ctx.lineWidth = Math.max(2, W * 0.0025);
      const r = Math.min(12, w * 0.15, h * 0.3);
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.stroke();

      // numbered circle badge
      const br = Math.max(14, Math.round(W * 0.013));
      const fs = Math.max(11, Math.round(br * 0.65));
      const bx = x + br + 3;
      const by = y + br + 3;
      ctx.fillStyle = s.badge;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = `bold ${fs}px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), bx, by);
    });

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const wfs = Math.max(13, Math.round(W * 0.011));
    ctx.font = `${wfs}px -apple-system,sans-serif`;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillText("Generated by SiteIQ · siteiqai.com", 18, H - 14);

    const a = document.createElement("a");
    try {
      const host = new URL(pageUrl.startsWith("http") ? pageUrl : `https://${pageUrl}`).hostname;
      a.download = `siteiq-${host}.png`;
    } catch { a.download = "siteiq-audit.png"; }
    a.href = canvas.toDataURL("image/png");
    a.click();
    onDone();
  };
  img.src = `data:image/png;base64,${screenshot}`;
}

/* ── annotation overlays (shared between viewer + modal) ────── */

function AnnOverlays({
  annotations,
  activeIdx,
  onEnter,
  onLeave,
  onClick,
}: {
  annotations: VisualAnnotation[];
  activeIdx: number | null;
  onEnter: (i: number) => void;
  onLeave: () => void;
  onClick?: (i: number) => void;
}) {
  return (
    <>
      {annotations.map((ann, i) => {
        const s = ANN_TYPE[ann.type] ?? ANN_TYPE.warning;
        const isActive = activeIdx === i;
        const tooltipUp = ann.y > 55;
        const clickable = !!ann.refSection && !!onClick;

        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${ann.x}%`,
              top: `${ann.y}%`,
              width: `${ann.width}%`,
              height: `${ann.height}%`,
              border: `2px solid ${s.badge}`,
              borderRadius: 12,
              boxShadow: isActive
                ? `0 4px 14px rgba(0,0,0,0.5), 0 0 0 2px ${s.badge}80`
                : "0 2px 8px rgba(0,0,0,0.3)",
              zIndex: isActive ? 30 : 10,
              cursor: "pointer",
              transition: "box-shadow 0.15s ease",
              animation: `siteiq-ann-fadein 0.3s ease-out ${i * 100}ms both`,
            }}
            onMouseEnter={() => onEnter(i)}
            onMouseLeave={onLeave}
            onClick={() => clickable && onClick(i)}
          >
            {/* numbered circle badge */}
            <span
              className="absolute flex items-center justify-center rounded-full text-white font-bold select-none pointer-events-none"
              style={{
                width: 22,
                height: 22,
                fontSize: 12,
                lineHeight: 1,
                background: s.badge,
                top: 4,
                left: 4,
                boxShadow: "0 1px 5px rgba(0,0,0,0.55)",
                zIndex: 5,
                transform: isActive ? "scale(1.2)" : "scale(1)",
                transition: "transform 0.15s ease",
              }}
            >
              {i + 1}
            </span>

            {/* hover tooltip */}
            {isActive && (
              <div
                className="absolute z-50 rounded-lg shadow-2xl pointer-events-none"
                style={{
                  background: "#0f172a",
                  color: "white",
                  padding: "8px 12px",
                  minWidth: 200,
                  maxWidth: 280,
                  [tooltipUp ? "bottom" : "top"]: "calc(100% + 6px)",
                  left: 0,
                }}
              >
                <p className="text-[11px] font-bold mb-0.5" style={{ color: s.badge }}>
                  {ann.label}
                </p>
                <p className="text-xs leading-snug opacity-90">{ann.description}</p>
                {clickable && (
                  <p className="text-[10px] mt-1.5 opacity-50">Click to jump to finding ↓</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ── fullscreen modal ───────────────────────────────────────── */

function FullscreenModal({
  screenshot,
  annotations,
  onClose,
  onAnnotationClick,
}: {
  screenshot: string;
  annotations: VisualAnnotation[];
  onClose: () => void;
  onAnnotationClick?: (i: number) => void;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const handleAnnClick = onAnnotationClick
    ? (i: number) => { onClose(); setTimeout(() => onAnnotationClick(i), 150); }
    : undefined;

  const modal = (
    <div className="fixed inset-0 z-[200] bg-gray-950 flex flex-col" role="dialog" aria-modal="true">
      {/* header */}
      <div className="shrink-0 h-12 flex items-center justify-between gap-4 px-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <SiteIQLogo size={20} />
          <span className="text-sm font-semibold text-white">Visual Analysis</span>
          <span className="text-white/30 hidden sm:block">·</span>
          <span className="text-xs text-white/50 truncate hidden sm:block">
            Scroll to explore · Click an annotation to jump to the finding
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-2.5">
            {(["critical", "warning", "good"] as const).map((t) => (
              <span key={t} className="flex items-center gap-1 text-[11px] text-white/60 capitalize">
                <span className="w-2 h-2 rounded-full" style={{ background: ANN_TYPE[t].badge }} />
                {t}
              </span>
            ))}
          </div>
          <button
            onClick={onClose}
            className="ml-2 w-8 h-8 rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors text-lg font-light"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* scrollable image */}
      <div className="flex-1 overflow-auto">
        <div className="relative block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${screenshot}`}
            alt="Annotated page screenshot"
            className="block w-full h-auto select-none"
            draggable={false}
          />
          <AnnOverlays
            annotations={annotations}
            activeIdx={activeIdx}
            onEnter={setActiveIdx}
            onLeave={() => setActiveIdx(null)}
            onClick={handleAnnClick}
          />
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined"
    ? createPortal(modal, document.body)
    : null;
}

/* ── split annotation panel ─────────────────────────────────── */

function SplitAnnotationPanel({
  screenshot,
  annotations,
  url,
}: {
  screenshot: string;
  annotations: VisualAnnotation[];
  url: string;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [scanDone, setScanDone] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const findingRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setScanDone(true), 1600);
    return () => clearTimeout(t);
  }, []);

  function select(i: number) {
    const next = selectedIdx === i ? null : i;
    setSelectedIdx(next);
    if (next !== null) {
      setTimeout(() => {
        findingRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    }
  }

  return (
    <div className="space-y-3">
      {/* toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          {(["critical", "warning", "good"] as const).map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ANN_TYPE[t].badge }} />
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            View Full Page
          </button>
          <button
            type="button"
            disabled={downloading}
            onClick={() => {
              setDownloading(true);
              downloadAnnotated(screenshot, annotations, url, () => setDownloading(false));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloading ? "Preparing…" : "Download PNG"}
          </button>
        </div>
      </div>

      {/* split panel */}
      <div className="flex rounded-xl border border-border overflow-hidden" style={{ height: 620 }}>

        {/* ── left: screenshot (60%) ── */}
        <div className="relative overflow-auto bg-black/10" style={{ flex: "0 0 60%" }}>
          {/* ALIGNMENT: relative block so top:y% annotation coords are correct */}
          <div className="relative block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${screenshot}`}
              alt="Page screenshot with annotations"
              className="block w-full h-auto select-none"
              draggable={false}
            />

            {/* teal scan line sweeping top→bottom on load */}
            {!scanDone && (
              <div
                className="absolute left-0 right-0 pointer-events-none z-20"
                style={{
                  height: 2,
                  top: 0,
                  background: "linear-gradient(90deg, transparent 0%, #06b6d4 15%, #06b6d4 85%, transparent 100%)",
                  boxShadow: "0 0 18px 8px rgba(6,182,212,0.4)",
                  animation: "siteiq-scanline 1.5s linear forwards",
                }}
              />
            )}

            {/* annotation boxes */}
            {annotations.map((ann, i) => {
              const s = ANN_TYPE[ann.type] ?? ANN_TYPE.warning;
              const isSelected = selectedIdx === i;
              const isDimmed = selectedIdx !== null && !isSelected;
              const isHovered = hoverIdx === i;
              const revealDelay = (ann.y / 100) * 1.5;
              const tooltipBelow = ann.y < 15;

              return (
                <div
                  key={i}
                  className="absolute cursor-pointer"
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    width: `${ann.width}%`,
                    height: `${ann.height}%`,
                    border: `2px solid ${isSelected ? "#06b6d4" : s.border}`,
                    borderRadius: 10,
                    opacity: isDimmed ? 0.3 : 1,
                    transition: "opacity 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                    boxShadow: isSelected
                      ? "0 0 0 3px rgba(6,182,212,0.3), 0 0 24px rgba(6,182,212,0.2)"
                      : isHovered
                      ? "0 2px 12px rgba(0,0,0,0.4)"
                      : "0 1px 4px rgba(0,0,0,0.25)",
                    zIndex: isSelected ? 30 : isHovered ? 20 : 10,
                    animation: `siteiq-ann-fadein 0.35s ease-out ${revealDelay}s both`,
                  }}
                  onClick={() => select(i)}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                >
                  {/* number badge */}
                  <span
                    className="absolute flex items-center justify-center rounded-full text-white font-bold select-none pointer-events-none"
                    style={{
                      width: 22,
                      height: 22,
                      fontSize: 12,
                      lineHeight: 1,
                      top: 4,
                      left: 4,
                      background: isSelected ? "#06b6d4" : s.badge,
                      boxShadow: "0 1px 5px rgba(0,0,0,0.55)",
                      transform: isSelected ? "scale(1.2)" : "scale(1)",
                      transition: "transform 0.15s ease, background 0.15s ease",
                    }}
                  >
                    {i + 1}
                  </span>

                  {/* teal pulse ring — active only */}
                  {isSelected && (
                    <div
                      className="absolute inset-0 rounded-[10px] pointer-events-none"
                      style={{
                        border: "2px solid #06b6d4",
                        animation: "siteiq-box-pulse 1.8s ease-in-out infinite",
                      }}
                    />
                  )}

                  {/* hover tooltip */}
                  {isHovered && (
                    <div
                      className="absolute z-50 pointer-events-none rounded-lg shadow-2xl"
                      style={{
                        background: "#0f172a",
                        color: "white",
                        padding: "6px 10px",
                        maxWidth: 220,
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        border: `1px solid ${s.badge}55`,
                        ...(tooltipBelow
                          ? { top: "calc(100% + 6px)" }
                          : { bottom: "calc(100% + 6px)" }),
                        left: 0,
                      }}
                    >
                      <span style={{ color: s.badge }}>{i + 1}.</span>{" "}{ann.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── divider ── */}
        <div className="w-px bg-border shrink-0" />

        {/* ── right: findings list (40%) ── */}
        <div className="flex-1 overflow-y-auto bg-card">
          {annotations.map((ann, i) => {
            const s = ANN_TYPE[ann.type] ?? ANN_TYPE.warning;
            const isExpanded = selectedIdx === i;
            const isActive = selectedIdx === i || hoverIdx === i;

            return (
              <div
                key={i}
                ref={(el) => { findingRefs.current[i] = el; }}
                className="border-b border-border cursor-pointer"
                style={{
                  background: isActive ? "rgba(6,182,212,0.06)" : "transparent",
                  transition: "background 0.15s ease",
                }}
                onClick={() => select(i)}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                {/* collapsed header — always visible */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span
                    className="shrink-0 flex items-center justify-center rounded-full text-white font-bold text-xs"
                    style={{
                      width: 24,
                      height: 24,
                      background: isActive ? "#06b6d4" : s.badge,
                      boxShadow: isActive ? "0 0 10px rgba(6,182,212,0.45)" : "none",
                      transition: "background 0.15s ease, box-shadow 0.15s ease",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
                    {ann.label}
                  </span>
                  <span
                    className="shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                    style={{ background: `${s.badge}22`, color: s.badge }}
                  >
                    {ann.type}
                  </span>
                  <svg
                    className="shrink-0 w-3.5 h-3.5 text-muted-foreground"
                    style={{
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* expanded content — spring slide down */}
                {isExpanded && (
                  <div
                    className="px-4 pb-4"
                    style={{ animation: "siteiq-slide-spring 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
                  >
                    <p className="text-xs text-muted-foreground leading-relaxed" style={{ paddingLeft: 36 }}>
                      {ann.description}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {fullscreen && (
        <FullscreenModal
          screenshot={screenshot}
          annotations={annotations}
          onClose={() => setFullscreen(false)}
        />
      )}
    </div>
  );
}

/* ── loading view ───────────────────────────────────────────── */

const RADAR_MESSAGES = [
  "Scanning your headlines...",
  "Analyzing trust signals...",
  "Checking CTA strength...",
  "Generating recommendations...",
];

function LoadingView({ progress, pageInfo }: { progress: number; statusMsg: string; pageInfo?: { current: number; total: number } | null }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setMsgVisible(false);
      setTimeout(() => {
        setMsgIdx((i) => (i + 1) % RADAR_MESSAGES.length);
        setMsgVisible(true);
      }, 220);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-76px)] flex items-center justify-center overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* blob background */}
      <div className="absolute inset-0 overflow-hidden">
        <AnimatedBlobs />
      </div>
      {/* content — centered over blobs */}
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-[280px] text-center">
        <div className="flex flex-col items-center gap-2">
          <SiteIQLogo size={40} className="opacity-90" />
          <span className="text-sm font-semibold tracking-wide text-white/70">SiteIQ</span>
        </div>
        <div className="w-full space-y-3">
          <h2 className="text-base font-semibold text-white/90">
            {pageInfo ? `Auditing page ${pageInfo.current} of ${pageInfo.total}` : "Analyzing your site"}
          </h2>
          {/* multi-page step indicators */}
          {pageInfo && pageInfo.total > 1 && (
            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: pageInfo.total }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i < pageInfo.current ? 20 : 6,
                    height: 6,
                    background: i < pageInfo.current ? "#06b6d4" : "rgba(255,255,255,0.15)",
                  }}
                />
              ))}
            </div>
          )}
          <div className="w-full h-[2px] rounded-full bg-white/10 overflow-hidden">
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
            className="text-xs text-white/40 transition-opacity duration-200"
            style={{ opacity: msgVisible ? 1 : 0 }}
          >
            {RADAR_MESSAGES[msgIdx]}
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
          <span data-score-tier={s.tier} className={cn("text-2xl font-extrabold leading-none tabular-nums", s.cls)}>
            {score}
          </span>
          <span className="text-xs font-medium text-muted-foreground">/10</span>
        </div>
      </div>
      <div className="h-[3px] rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div data-bar-fill={s.tier} className="h-full rounded-full" style={{ width: `${score * 10}%`, background: s.hex }} />
      </div>
      {quote && (
        <blockquote data-print="issue-quote" className="border-l-2 pl-3 italic text-xs text-foreground leading-relaxed" style={{ borderColor: s.hex }}>
          &ldquo;{quote}&rdquo;
        </blockquote>
      )}
      <p className="text-xs text-muted-foreground leading-relaxed">{finding}</p>
    </div>
  );
}

/* ── top fix card ───────────────────────────────────────────── */

function FixCard({
  index,
  fix,
  annNumber,
  annType,
  isHighlighted,
}: {
  index: number;
  fix: TopFix;
  annNumber: number | null;
  annType: VisualAnnotation["type"] | null;
  isHighlighted: boolean;
}) {
  const d = DIFFICULTY[fix.difficulty] ?? DIFFICULTY.medium;
  return (
    <div
      id={annNumber != null ? `audit-ann-${annNumber - 1}` : undefined}
      className={cn(
        "flex gap-4 items-start rounded-xl border border-border bg-card px-5 py-4 break-inside-avoid transition-shadow",
        isHighlighted && "siteiq-highlight",
      )}
      style={{ scrollMarginTop: "140px" }}
    >
      <div data-print="fix-num" className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold text-white" style={{ background: "linear-gradient(135deg,#2563eb,#06b6d4)" }}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm font-semibold text-foreground leading-snug flex items-center gap-1.5 flex-wrap">
          {fix.fix}
          {annNumber != null && annType != null && <AnnBadge number={annNumber} type={annType} />}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">{fix.impact}</p>
      </div>
      <span data-difficulty={fix.difficulty} className={cn("shrink-0 self-start mt-0.5 px-2.5 py-1 rounded-full text-[11px] font-semibold", d.cls)}>
        {d.label}
      </span>
    </div>
  );
}

/* ── pillar card ────────────────────────────────────────────── */

function PillarCard({
  pillar,
  annNumber,
  annType,
  isHighlighted,
}: {
  pillar: PillarResultV2;
  annNumber: number | null;
  annType: VisualAnnotation["type"] | null;
  isHighlighted: boolean;
}) {
  const s = sc(pillar.score);
  return (
    <div
      id={annNumber != null ? `audit-ann-${annNumber - 1}` : undefined}
      className={cn(
        "rounded-xl border border-border bg-card overflow-hidden flex flex-col break-inside-avoid transition-shadow",
        isHighlighted && "siteiq-highlight",
      )}
      style={{ scrollMarginTop: "140px" }}
    >
      <div className={cn("px-5 py-4 flex items-start justify-between gap-3", s.bgCls)}>
        <div>
          <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5", s.cls)}>
            {pillar.name}
            {annNumber != null && annType != null && <AnnBadge number={annNumber} type={annType} />}
          </p>
          <div className="flex items-baseline gap-1">
            <span data-score-tier={s.tier} className={cn("text-[2.25rem] font-extrabold leading-none tabular-nums", s.cls)}>
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
            <div data-bar-fill={s.tier} className="h-full rounded-full" style={{ width: `${pillar.score * 10}%`, background: s.hex }} />
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
            <blockquote data-print="issue-quote" className="border-l-2 border-blue-300 dark:border-blue-700 pl-3 text-xs italic text-foreground leading-relaxed">
              &ldquo;{pillar.exactIssue}&rdquo;
            </blockquote>
          ) : (
            <p className="text-xs text-muted-foreground italic">No specific issue identified.</p>
          )}
        </div>
        <div data-print="rewrite-panel" className="px-4 py-4 space-y-2 bg-cyan-50/60 dark:bg-cyan-950/20">
          <p data-print="rewrite-label" className="text-[10px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
            Suggested Rewrite
          </p>
          <p className="text-xs text-foreground leading-relaxed">{pillar.rewrite || "—"}</p>
        </div>
      </div>

      {pillar.benchmark && (
        <div className="px-5 py-2.5 border-t border-border bg-muted/30">
          <p className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Benchmark:</span>{" "}{pillar.benchmark}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── results view ───────────────────────────────────────────── */

function ResultsView({ audit, url, screenshot }: { audit: AuditResultV2; url: string; screenshot: string | null }) {
  const grade = (audit.overallGrade ?? "F").toUpperCase();
  const gradeRing = GRADE_RING[grade] ?? "#dc2626";
  // Sort top-to-bottom, then resolve overlapping boxes so all are visible and numbered sequentially
  const rawAnnotations = [...(audit.visualAnnotations ?? [])].sort((a, b) => a.y - b.y);
  const sortedAnnotations = resolveAnnotationOverlaps(rawAnnotations);
  const hasAnnotations = !!(screenshot && sortedAnnotations.length > 0);

  // Build refSection → sorted annotation index map
  const annMap: Record<string, number> = {};
  sortedAnnotations.forEach((ann, i) => {
    if (ann.refSection) annMap[ann.refSection] = i;
  });

  function getAnn(refKey: string) {
    const idx = annMap[refKey];
    if (idx === undefined) return { annNumber: null, annType: null };
    return {
      annNumber: idx + 1,
      annType: sortedAnnotations[idx].type,
    };
  }

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
            <span className="shrink-0 w-6 h-6 rounded-full border-[2px] flex items-center justify-center text-[11px] font-extrabold" style={{ borderColor: gradeRing, color: gradeRing }}>
              {grade}
            </span>
            <span className="text-sm text-muted-foreground truncate hidden sm:block">{url}</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">New audit</a>
            <button className="text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors font-medium cursor-pointer" onClick={() => window.print()}>
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* report header */}
      <div className="border-b border-border bg-muted/20 print:bg-transparent">
        <div className="max-w-5xl mx-auto px-6 py-8 print:py-5">
          <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8">
            <div className="shrink-0 flex flex-col items-center gap-1.5">
              <div data-grade={grade} className="w-20 h-20 rounded-full border-[3px] flex items-center justify-center text-4xl font-extrabold" style={{ borderColor: gradeRing, color: gradeRing }}>
                {grade}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Overall Grade</p>
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Audited Site</p>
                <p className="text-sm font-medium text-foreground">{url}</p>
              </div>
              {audit.classification && (
                <div className="flex flex-wrap gap-2">
                  {[audit.classification.siteType, audit.classification.targetCustomer, audit.classification.primaryGoal]
                    .filter(Boolean).map((tag) => (
                      <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">{tag}</span>
                    ))}
                </div>
              )}
              {audit.revenueImpact && (
                <div data-print="revenue" className="flex items-start gap-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 px-4 py-3 max-w-xl">
                  <svg data-print="revenue-icon" className="shrink-0 mt-0.5 w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs font-medium text-cyan-900 dark:text-cyan-200 leading-relaxed">{audit.revenueImpact}</p>
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
              subtitle="Click an annotation box or finding to explore — hover a box for a quick label"
            />
            <SplitAnnotationPanel
              screenshot={screenshot!}
              annotations={sortedAnnotations}
              url={url}
            />
          </section>
        )}

        {/* five-second test */}
        {audit.fiveSecondTest && (
          <section>
            <SectionHeading number={hasAnnotations ? "02" : "01"} title="Five-Second Test" subtitle="What a first-time visitor understands in their first 5 seconds" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FiveSecondCard label="What It Does" score={audit.fiveSecondTest.whatItDoes.score} quote={audit.fiveSecondTest.whatItDoes.quote} finding={audit.fiveSecondTest.whatItDoes.finding} />
              <FiveSecondCard label="Who It's For" score={audit.fiveSecondTest.whoItsFor.score} quote={audit.fiveSecondTest.whoItsFor.quote} finding={audit.fiveSecondTest.whoItsFor.finding} />
              <FiveSecondCard label="What To Do" score={audit.fiveSecondTest.whatToDo.score} quote={audit.fiveSecondTest.whatToDo.quote} finding={audit.fiveSecondTest.whatToDo.finding} />
            </div>
          </section>
        )}

        {/* top fixes */}
        {(audit.topFixes?.length ?? 0) > 0 && (
          <section>
            <SectionHeading number={hasAnnotations ? "03" : "02"} title="Top 3 Revenue Opportunities" subtitle="Ranked by estimated conversion impact — fix these first" />
            <div className="space-y-3">
              {audit.topFixes.map((fix, i) => {
                const { annNumber, annType } = getAnn(`fix${i + 1}`);
                return (
                  <FixCard
                    key={i}
                    index={i}
                    fix={fix}
                    annNumber={annNumber}
                    annType={annType}
                    isHighlighted={false}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* pillar analysis */}
        {(audit.pillars?.length ?? 0) > 0 && (
          <section>
            <SectionHeading number={hasAnnotations ? "04" : "03"} title="Pillar Analysis" subtitle="Six dimensions of conversion performance — exact issue and rewrite for each" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {audit.pillars.map((pillar) => {
                const { annNumber, annType } = getAnn(pillar.name);
                return (
                  <PillarCard
                    key={pillar.name}
                    pillar={pillar}
                    annNumber={annNumber}
                    annType={annType}
                    isHighlighted={false}
                  />
                );
              })}
            </div>
          </section>
        )}

      </div>

      {/* print footer */}
      <div className="hidden print:block px-8 py-4 border-t border-gray-200 mt-8">
        <p className="text-[10px] text-gray-400 text-center">
          Generated by SiteIQ · siteiqai.com · {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>
    </div>
  );
}

/* ── site overview (multi-page) ─────────────────────────────── */

function gradeToGpa(grade: string): number {
  return { A: 4, B: 3, C: 2, D: 1, F: 0 }[grade] ?? 0;
}
function gpaToGrade(avg: number): string {
  if (avg >= 3.5) return "A";
  if (avg >= 2.5) return "B";
  if (avg >= 1.5) return "C";
  if (avg >= 0.5) return "D";
  return "F";
}

function SiteOverview({ pages }: { pages: PageResult[] }) {
  const siteGrade = gpaToGrade(
    pages.reduce((s, p) => s + gradeToGpa(p.audit.overallGrade ?? "F"), 0) / pages.length
  );
  const siteColor = GRADE_RING[siteGrade] ?? "#dc2626";

  // Biggest wins: first topFix from each page, deduplicated by text prefix, max 3
  type Win = { fix: TopFix; pageUrl: string };
  const seen = new Set<string>();
  const wins: Win[] = [];
  for (const page of pages) {
    for (const fix of page.audit.topFixes ?? []) {
      const key = fix.fix.slice(0, 40).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        wins.push({ fix, pageUrl: page.url });
        if (wins.length >= 3) break;
      }
    }
    if (wins.length >= 3) break;
  }

  function pagePath(u: string) {
    try { return new URL(u).pathname || "/"; } catch { return u; }
  }

  return (
    <div className="min-h-screen print:min-h-0">
      {/* sticky bar */}
      <div className="sticky top-[76px] z-40 bg-background/90 backdrop-blur-sm border-b border-border print:hidden">
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full border-[2px] flex items-center justify-center text-[11px] font-extrabold" style={{ borderColor: siteColor, color: siteColor }}>
            {siteGrade}
          </span>
          <span className="text-sm text-muted-foreground">Site Overview — {pages.length} pages audited</span>
          <div className="flex-1" />
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">New audit</a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">

        {/* Overall grade */}
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div
              className="w-24 h-24 rounded-full border-[3px] flex items-center justify-center text-5xl font-extrabold"
              style={{ borderColor: siteColor, color: siteColor }}
            >
              {siteGrade}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Site Grade</p>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">
              {siteGrade === "A" ? "Excellent across the board" :
               siteGrade === "B" ? "Strong performance, a few gaps" :
               siteGrade === "C" ? "Room for improvement" :
               siteGrade === "D" ? "Significant issues found" :
               "Critical issues — act now"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Average across {pages.length} audited page{pages.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Page comparison table */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Page Comparison</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Page</th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground w-20">Grade</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Top Issue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pages.map((page) => {
                  const grade = (page.audit.overallGrade ?? "F").toUpperCase();
                  const color = GRADE_RING[grade] ?? "#dc2626";
                  const topFix = page.audit.topFixes?.[0];
                  return (
                    <tr key={page.url} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-sm text-foreground">{pagePath(page.url)}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-extrabold"
                          style={{ borderColor: color, color }}
                        >
                          {grade}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-xs">
                        {topFix ? topFix.fix : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Biggest wins */}
        {wins.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-foreground mb-1">Biggest Wins Across Your Site</h2>
            <p className="text-sm text-muted-foreground mb-4">The highest-impact fixes to prioritize first</p>
            <div className="space-y-3">
              {wins.map(({ fix, pageUrl }, i) => {
                const d = DIFFICULTY[fix.difficulty] ?? DIFFICULTY.medium;
                return (
                  <div key={i} className="flex gap-4 items-start rounded-xl border border-border bg-card px-5 py-4">
                    <div
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold text-white"
                      style={{ background: "linear-gradient(135deg,#2563eb,#06b6d4)" }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-foreground leading-snug">{fix.fix}</p>
                      <p className="text-xs text-muted-foreground">{fix.impact}</p>
                      <p className="text-[11px] text-muted-foreground/60 font-mono">{pagePath(pageUrl)}</p>
                    </div>
                    <span className={cn("shrink-0 self-start mt-0.5 px-2.5 py-1 rounded-full text-[11px] font-semibold", d.cls)}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ── multi-page tab bar ─────────────────────────────────────── */

function MultiPageView({ pages, url }: { pages: PageResult[]; url: string }) {
  const [activeTab, setActiveTab] = useState(0);

  function tabLabel(pageUrl: string) {
    try { return new URL(pageUrl).pathname || "/"; } catch { return pageUrl; }
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="sticky top-[76px] z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center gap-1 overflow-x-auto py-0 hide-scrollbar">
            {/* Site Overview tab */}
            <button
              type="button"
              onClick={() => setActiveTab(0)}
              className={cn(
                "shrink-0 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === 0
                  ? "border-cyan-500 text-cyan-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Site Overview
            </button>

            {/* Per-page tabs */}
            {pages.map((page, i) => {
              const grade = (page.audit.overallGrade ?? "F").toUpperCase();
              const color = GRADE_RING[grade] ?? "#dc2626";
              return (
                <button
                  key={page.url}
                  type="button"
                  onClick={() => setActiveTab(i + 1)}
                  className={cn(
                    "shrink-0 flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    activeTab === i + 1
                      ? "border-cyan-500 text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="font-mono">{tabLabel(page.url)}</span>
                  <span
                    className="text-[10px] font-bold leading-none w-5 h-5 rounded-full border flex items-center justify-center"
                    style={{ borderColor: color, color }}
                  >
                    {grade}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 0 ? (
        <SiteOverview pages={pages} />
      ) : (
        <ResultsView
          audit={pages[activeTab - 1].audit}
          url={pages[activeTab - 1].url}
          screenshot={pages[activeTab - 1].screenshot}
        />
      )}
    </div>
  );
}

/* ── main export ────────────────────────────────────────────── */

export default function ResultsClient({ url, urls }: { url: string; urls?: string }) {
  const isMultiPage = !!urls;

  const [phase, setPhase] = useState<"loading" | "results" | "error">("loading");
  // Single-page state
  const [audit, setAudit] = useState<AuditResultV2 | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  // Multi-page state
  const [pages, setPages] = useState<PageResult[]>([]);
  // Shared loading state
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(5);
  const [statusMsg, setStatusMsg] = useState("Connecting…");
  const [pageInfo, setPageInfo] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const fetchUrl = isMultiPage
        ? `/api/audit?urls=${encodeURIComponent(urls!)}`
        : `/api/audit?url=${encodeURIComponent(url)}`;

      let res: Response;
      try {
        res = await fetch(fetchUrl);
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let msg: any;
          try { msg = JSON.parse(line.slice(6)); } catch { continue; }

          if (msg.type === "progress") {
            setStatusMsg(msg.message ?? "Analyzing…");
            if (msg.pageIndex !== undefined && msg.total !== undefined) {
              setPageInfo({ current: msg.pageIndex + 1, total: msg.total });
              setProgress(Math.max(5, Math.round((msg.pageIndex / msg.total) * 95)));
            } else {
              setProgress((p) => Math.min(p + 30, 85));
            }
          } else if (msg.type === "result" && msg.data) {
            // Single-page result
            const snap = msg.screenshot ?? null;
            setProgress(100);
            setTimeout(() => {
              if (!cancelled) { setAudit(msg.data); setScreenshot(snap); setPhase("results"); }
            }, 500);
          } else if (msg.type === "page_result" && msg.data) {
            // Multi-page: accumulate results
            const result: PageResult = { url: msg.url, audit: msg.data, screenshot: msg.screenshot ?? null };
            if (!cancelled) setPages((prev) => [...prev, result]);
            setProgress(Math.round(((msg.pageIndex + 1) / msg.total) * 95));
          } else if (msg.type === "complete") {
            setProgress(100);
            setTimeout(() => {
              if (!cancelled) setPhase("results");
            }, 500);
          } else if (msg.type === "error") {
            if (!cancelled) { setErrorMsg(msg.message ?? "Audit failed"); setPhase("error"); }
          }
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [url, urls, isMultiPage]);

  if (phase === "error") {
    return (
      <div className="min-h-[calc(100vh-76px)] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 font-bold text-xl">×</div>
          <h2 className="text-lg font-semibold">Audit failed</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{errorMsg}</p>
          <a href="/" className="text-sm text-blue-500 hover:underline">← Try another URL</a>
        </div>
      </div>
    );
  }

  if (phase === "loading") return <LoadingView progress={progress} statusMsg={statusMsg} pageInfo={pageInfo} />;

  if (isMultiPage && pages.length > 0) {
    return <MultiPageView pages={pages} url={url} />;
  }

  return <ResultsView audit={audit!} url={url} screenshot={screenshot} />;
}
