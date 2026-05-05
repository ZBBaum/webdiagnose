"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import type { AuditResultV2, PillarResultV2, TopFix, VisualAnnotation } from "@/lib/auditor";
import { cn } from "@/lib/utils";
import SiteIQLogo from "@/components/SiteIQLogo";
import { AnimatedBlobs } from "@/components/ui/blobs";

/* ── multi-page types ───────────────────────────────────────── */

type PageResult = { url: string; audit: AuditResultV2; screenshot: string | null };

/* ── tier type ──────────────────────────────────────────────── */

export type Tier = "free" | "pro" | "agency";

/* ── tab types ──────────────────────────────────────────────── */

type Tab = "overview" | "visual" | "fixes" | "pillars" | "fivesecond";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview",   label: "Overview" },
  { id: "visual",     label: "Visual Analysis" },
  { id: "fixes",      label: "Top Fixes" },
  { id: "pillars",    label: "Pillar Breakdown" },
  { id: "fivesecond", label: "Five-Second Test" },
];

/* ── global CSS ─────────────────────────────────────────────── */

const GLOBAL_CSS = `
  @keyframes siteiq-scanline {
    from { top: 0; }
    to { top: 100%; }
  }
  @keyframes siteiq-ann-fadein {
    from { opacity: 0; transform: scale(0.94); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes siteiq-box-pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  @keyframes siteiq-slide-spring {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes siteiq-shimmer {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
  @keyframes siteiq-fadein {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes siteiq-logo-glow {
    0%, 100% { filter: drop-shadow(0 0 6px rgba(6,182,212,0.25)); }
    50% { filter: drop-shadow(0 0 18px rgba(6,182,212,0.65)); }
  }
  .siteiq-section-appear { animation: siteiq-fadein 0.4s ease-out both; }
  .premium-card {
    background: #111118;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    position: relative;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    overflow: hidden;
  }
  .premium-card:hover {
    transform: scale(1.015);
    border-color: rgba(255,255,255,0.13);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.6);
  }
  .siteiq-highlight {
    border-color: rgba(255,255,255,0.18) !important;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 4px 20px rgba(0,0,0,0.5) !important;
  }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  @media print {
    .premium-card {
      background: #fff !important;
      border: 1px solid #e5e7eb !important;
      box-shadow: none !important;
      transform: none !important;
    }
    .siteiq-sidebar { display: none !important; }
    .siteiq-topbar { display: none !important; }
    .siteiq-mobile-tabbar { display: none !important; }
    .siteiq-main { margin-left: 0 !important; }
  }
`;

/* ── score helpers ──────────────────────────────────────────── */

function getScoreColor(score: number): string {
  if (score <= 2) return "#1e3a6e";
  if (score <= 4) return "#1d4ed8";
  if (score <= 6) return "#2563eb";
  if (score <= 8) return "#0891b2";
  return "#06b6d4";
}

function sc(score: number) {
  const hex = getScoreColor(score);
  if (score >= 9) return { tier: "good" as const,    hex, label: "Excellent" };
  if (score >= 7) return { tier: "good" as const,    hex, label: "Good" };
  if (score >= 5) return { tier: "warning" as const, hex, label: "Needs work" };
  return {          tier: "critical" as const,        hex, label: "Critical" };
}

function gradeColor(grade: string): string {
  if (grade === "A") return "#06b6d4";
  if (grade === "B") return "#0891b2";
  if (grade === "C") return "#2563eb";
  if (grade === "D") return "#1d4ed8";
  return "#1e3a6e";
}

/* ── difficulty ─────────────────────────────────────────────── */

const DIFFICULTY: Record<string, { label: string; dot: string }> = {
  easy:   { label: "Easy",   dot: "#06b6d4" },
  medium: { label: "Medium", dot: "#0891b2" },
  hard:   { label: "Hard",   dot: "#1d4ed8" },
};

/* ── annotation type colors ─────────────────────────────────── */

const ANN_TYPE: Record<VisualAnnotation["type"], { border: string; badge: string; dot: string }> = {
  critical: { border: "#ef4444", badge: "#ef4444", dot: "bg-[#ef4444]" },
  warning:  { border: "#f59e0b", badge: "#f59e0b", dot: "bg-[#f59e0b]" },
  good:     { border: "#06b6d4", badge: "#06b6d4", dot: "bg-[#06b6d4]" },
};

/* ── premium card wrapper ────────────────────────────────────── */

function PremiumCard({ children, className = "", id, style }: {
  children: React.ReactNode; className?: string; id?: string; style?: React.CSSProperties;
}) {
  return (
    <div id={id} className={`premium-card ${className}`} style={style}>
      {children}
    </div>
  );
}

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
      style={{ width: 16, height: 16, fontSize: 9, lineHeight: 1, background: s.badge, opacity: 0.9 }}
      title={`See annotation ${number} in the visual analysis`}
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

/* ── annotation overlays ────────────────────────────────────── */

function AnnOverlays({
  annotations, activeIdx, onEnter, onLeave, onClick,
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
            <span
              className="absolute flex items-center justify-center rounded-full text-white font-bold select-none pointer-events-none"
              style={{
                width: 22, height: 22, fontSize: 12, lineHeight: 1,
                background: s.badge, top: 4, left: 4,
                boxShadow: `0 1px 5px rgba(0,0,0,0.55), 0 0 10px ${s.badge}cc, 0 0 20px ${s.badge}55`,
                zIndex: 5,
                transform: isActive ? "scale(1.2)" : "scale(1)",
                transition: "transform 0.15s ease",
              }}
            >
              {i + 1}
            </span>
            {isActive && (
              <div
                className="absolute z-50 rounded-lg shadow-2xl pointer-events-none"
                style={{
                  background: "#0f172a", color: "white",
                  padding: "8px 12px", minWidth: 200, maxWidth: 280,
                  [tooltipUp ? "bottom" : "top"]: "calc(100% + 6px)", left: 0,
                }}
              >
                <p className="text-[11px] font-bold mb-0.5" style={{ color: s.badge }}>{ann.label}</p>
                <p className="text-xs leading-snug opacity-90">{ann.description}</p>
                {clickable && <p className="text-[10px] mt-1.5 opacity-50">Click to jump to finding ↓</p>}
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
  screenshot, annotations, onClose, onAnnotationClick,
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
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "#0a0a0f" }} role="dialog" aria-modal="true">
      <div className="shrink-0 h-12 flex items-center justify-between gap-4 px-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-3 min-w-0">
          <SiteIQLogo size={20} />
          <span className="text-sm font-medium text-white/80">Visual Analysis</span>
          <span className="text-white/20 hidden sm:block">·</span>
          <span className="text-xs text-white/40 truncate hidden sm:block">
            Scroll to explore · Click an annotation to jump to the finding
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-3">
            {(["critical", "warning", "good"] as const).map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[11px] text-white/40 capitalize">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: ANN_TYPE[t].badge }} />
                {t}
              </span>
            ))}
          </div>
          <button
            onClick={onClose}
            className="ml-2 w-8 h-8 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.07] transition-colors text-lg font-light"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>
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

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}

/* ── split annotation panel ─────────────────────────────────── */

function SplitAnnotationPanel({
  screenshot, annotations, url,
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          {(["critical", "warning", "good"] as const).map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-[11px] text-white/40 capitalize">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ANN_TYPE[t].badge }} />
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/[0.07] text-xs font-medium text-white/50 hover:text-white/80 hover:border-white/[0.13] transition-colors"
            style={{ background: "#111118" }}
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/[0.07] text-xs font-medium text-white/50 hover:text-white/80 hover:border-white/[0.13] transition-colors disabled:opacity-40"
            style={{ background: "#111118" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloading ? "Preparing…" : "Download PNG"}
          </button>
        </div>
      </div>

      <div className="flex rounded-xl overflow-hidden border border-white/[0.07]" style={{ height: 620 }}>
        <div className="relative overflow-auto" style={{ flex: "0 0 60%", background: "#0a0a0f" }}>
          <div className="relative block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${screenshot}`}
              alt="Page screenshot with annotations"
              className="block w-full h-auto select-none"
              draggable={false}
            />
            {!scanDone && (
              <div
                className="absolute left-0 right-0 pointer-events-none z-20"
                style={{
                  height: 2, top: 0,
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 15%, rgba(255,255,255,0.4) 85%, transparent 100%)",
                  boxShadow: "0 0 18px 8px rgba(255,255,255,0.1)",
                  animation: "siteiq-scanline 1.5s linear forwards",
                }}
              />
            )}
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
                    left: `${ann.x}%`, top: `${ann.y}%`,
                    width: `${ann.width}%`, height: `${ann.height}%`,
                    border: `2px solid ${s.border}`,
                    borderRadius: 10,
                    opacity: isDimmed ? 0.25 : 1,
                    transition: "opacity 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                    boxShadow: isSelected
                      ? `0 0 0 2px ${s.badge}40, 0 0 20px ${s.badge}20`
                      : isHovered ? "0 2px 12px rgba(0,0,0,0.4)" : "0 1px 4px rgba(0,0,0,0.25)",
                    zIndex: isSelected ? 30 : isHovered ? 20 : 10,
                    animation: `siteiq-ann-fadein 0.35s ease-out ${revealDelay}s both`,
                  }}
                  onClick={() => select(i)}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                >
                  <span
                    className="absolute flex items-center justify-center rounded-full text-white font-bold select-none pointer-events-none"
                    style={{
                      width: 22, height: 22, fontSize: 12, lineHeight: 1,
                      top: 4, left: 4, background: s.badge,
                      boxShadow: "0 1px 5px rgba(0,0,0,0.55)",
                      transform: isSelected ? "scale(1.2)" : "scale(1)",
                      transition: "transform 0.15s ease, background 0.15s ease",
                    }}
                  >
                    {i + 1}
                  </span>
                  {isSelected && (
                    <div
                      className="absolute inset-0 rounded-[10px] pointer-events-none"
                      style={{ border: `2px solid ${s.badge}`, animation: "siteiq-box-pulse 1.8s ease-in-out infinite" }}
                    />
                  )}
                  {isHovered && (
                    <div
                      className="absolute z-50 pointer-events-none rounded-lg shadow-2xl"
                      style={{
                        background: "#111118", color: "white",
                        padding: "6px 10px", maxWidth: 220,
                        fontSize: 12, fontWeight: 600,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        border: `1px solid ${s.badge}33`,
                        ...(tooltipBelow ? { top: "calc(100% + 6px)" } : { bottom: "calc(100% + 6px)" }),
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

        <div className="w-px shrink-0" style={{ background: "rgba(255,255,255,0.07)" }} />

        <div className="flex-1 overflow-y-auto" style={{ background: "#111118" }}>
          {annotations.map((ann, i) => {
            const s = ANN_TYPE[ann.type] ?? ANN_TYPE.warning;
            const isExpanded = selectedIdx === i;
            const isActive = selectedIdx === i || hoverIdx === i;

            return (
              <div
                key={i}
                ref={(el) => { findingRefs.current[i] = el; }}
                className="border-b cursor-pointer"
                style={{
                  borderColor: "rgba(255,255,255,0.07)",
                  background: isActive ? "rgba(255,255,255,0.03)" : "transparent",
                  transition: "background 0.15s ease",
                }}
                onClick={() => select(i)}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span
                    className="shrink-0 flex items-center justify-center rounded-full text-white font-bold text-xs"
                    style={{ width: 22, height: 22, background: s.badge, opacity: isActive ? 1 : 0.7, transition: "opacity 0.15s ease" }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-medium text-white/80 truncate">{ann.label}</span>
                  <span className="shrink-0 flex items-center gap-1.5 text-[10px] text-white/40 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.badge }} />
                    {ann.type}
                  </span>
                  <svg
                    className="shrink-0 w-3.5 h-3.5 text-white/30"
                    style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4" style={{ animation: "siteiq-slide-spring 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
                    <p className="text-xs text-white/50 leading-relaxed" style={{ paddingLeft: 34 }}>{ann.description}</p>
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

function LoadingView({ progress }: { progress: number }) {
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
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden" style={{ background: "#0a0a0f" }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <div className="absolute inset-0 overflow-hidden">
        <AnimatedBlobs />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-[280px] text-center">
        <div className="flex flex-col items-center gap-2">
          <div style={{ animation: "siteiq-logo-glow 2.2s ease-in-out infinite" }}>
            <SiteIQLogo size={40} className="opacity-90" />
          </div>
          <span className="text-sm font-medium tracking-wide text-white/50">SiteIQ</span>
        </div>
        <div className="w-full space-y-3">
          <h2 className="text-base font-semibold text-white/80">Analyzing your site</h2>
          <div className="w-full h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg,#2563eb,#06b6d4)",
                transition: "width 1.2s ease",
              }}
            />
          </div>
          <p
            className="text-xs text-white/30 transition-opacity duration-200"
            style={{ opacity: msgVisible ? 1 : 0 }}
          >
            {RADAR_MESSAGES[msgIdx]}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── pillar mini row ─────────────────────────────────────────── */

function PillarMiniRow({ pillar }: { pillar: PillarResultV2 }) {
  const color = getScoreColor(pillar.score);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
      <span style={{
        fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em",
        color: "rgba(255,255,255,0.35)", flex: 1, minWidth: 0,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {pillar.name}
      </span>
      <div style={{ flex: "0 0 64px", height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pillar.score * 10}%`, background: color, opacity: 0.8, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, minWidth: 30, textAlign: "right" }}>
        {pillar.score}<span style={{ color: "rgba(255,255,255,0.25)", fontWeight: 400 }}>/10</span>
      </span>
    </div>
  );
}

/* ── five-second card ───────────────────────────────────────── */

function FiveSecondCard({
  label, score, quote, finding,
}: { label: string; score: number; quote: string; finding: string }) {
  const color = getScoreColor(score);
  return (
    <PremiumCard className="p-6 flex flex-col gap-4 break-inside-avoid">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.09em", color: "rgba(255,255,255,0.35)" }}>
          {label}
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 2, flexShrink: 0 }}>
          <span style={{ fontSize: 32, fontWeight: 300, lineHeight: 1, color }}>{score}</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 2 }}>/10</span>
        </div>
      </div>
      <div style={{ height: 2, background: "rgba(255,255,255,0.07)", borderRadius: 1, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score * 10}%`, background: color, opacity: 0.65 }} />
      </div>
      {quote && (
        <blockquote
          data-print="issue-quote"
          style={{ borderLeft: `2px solid ${color}55`, paddingLeft: 10, margin: 0 }}
        >
          <p style={{ fontSize: 12, fontStyle: "italic", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
            &ldquo;{quote}&rdquo;
          </p>
        </blockquote>
      )}
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{finding}</p>
    </PremiumCard>
  );
}

/* ── top fix card ───────────────────────────────────────────── */

function FixCard({
  index, fix, annNumber, annType, isHighlighted,
}: {
  index: number;
  fix: TopFix;
  annNumber: number | null;
  annType: VisualAnnotation["type"] | null;
  isHighlighted: boolean;
}) {
  const d = DIFFICULTY[fix.difficulty] ?? DIFFICULTY.medium;
  return (
    <PremiumCard
      id={annNumber != null ? `audit-ann-${annNumber - 1}` : undefined}
      className={cn("p-6 break-inside-avoid", isHighlighted && "siteiq-highlight")}
      style={{ scrollMarginTop: "140px" }}
    >
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div style={{
          fontSize: 48, fontWeight: 700, color: "rgba(255,255,255,0.06)",
          lineHeight: 1, flexShrink: 0, fontVariantNumeric: "tabular-nums",
          width: 42, textAlign: "center",
        }}>
          {index + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)",
            lineHeight: 1.4, marginBottom: 8,
            display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
          }}>
            {fix.fix}
            {annNumber != null && annType != null && <AnnBadge number={annNumber} type={annType} />}
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 12 }}>{fix.impact}</p>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.45)",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 999, padding: "3px 10px",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: d.dot, flexShrink: 0 }} />
            {d.label}
          </span>
        </div>
      </div>
    </PremiumCard>
  );
}

/* ── pillar card ────────────────────────────────────────────── */

function PillarCard({
  pillar, annNumber, annType, isHighlighted, tier,
}: {
  pillar: PillarResultV2;
  annNumber: number | null;
  annType: VisualAnnotation["type"] | null;
  isHighlighted: boolean;
  tier: Tier;
}) {
  const s = sc(pillar.score);
  const [fixes, setFixes] = useState<Array<{ advice: string; copy: string }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function handleFix() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pillarName: pillar.name,
          issueText: pillar.exactIssue || pillar.summary,
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.fixes)) setFixes(data.fixes);
    } catch {
      // silent failure
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string, idx: number) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  }

  return (
    <PremiumCard
      id={annNumber != null ? `audit-ann-${annNumber - 1}` : undefined}
      className={cn("flex flex-col break-inside-avoid", isHighlighted && "siteiq-highlight")}
      style={{ scrollMarginTop: "140px" }}
    >
      {/* header */}
      <div className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35 mb-1 flex items-center gap-1.5">
              {pillar.name}
              {annNumber != null && annType != null && <AnnBadge number={annNumber} type={annType} />}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-light leading-none tabular-nums" style={{ color: s.hex }}>
                {pillar.score}
              </span>
              <span className="text-sm text-white/30 font-normal mb-1">/10</span>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-white/40 mt-1">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.hex, opacity: 0.7 }} />
            {s.label}
          </span>
        </div>
        <div className="mt-3 h-[2px] rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div className="h-full rounded-full" style={{ width: `${pillar.score * 10}%`, background: s.hex, opacity: 0.5 }} />
        </div>
      </div>

      {/* summary */}
      <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-sm text-white/55 leading-relaxed">{pillar.summary}</p>
      </div>

      {/* issue + rewrite */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x" style={{ '--tw-divide-opacity': 1, borderColor: "rgba(255,255,255,0.07)" } as React.CSSProperties}>
        <div className="px-6 py-5 space-y-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Issue Found</p>
          {pillar.exactIssue ? (
            <blockquote
              data-print="issue-quote"
              className="pl-3 text-xs italic text-white/55 leading-relaxed"
              style={{ borderLeft: "2px solid rgba(255,255,255,0.12)" }}
            >
              &ldquo;{pillar.exactIssue}&rdquo;
            </blockquote>
          ) : (
            <p className="text-xs text-white/30 italic">No specific issue identified.</p>
          )}
        </div>
        <div
          data-print="rewrite-panel"
          className="px-6 py-5 space-y-2.5"
          style={{ background: "rgba(6,182,212,0.03)" }}
        >
          <p data-print="rewrite-label" className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#06b6d4" }}>
            Suggested Rewrite
          </p>
          <div style={{ borderLeft: "2px solid #06b6d4", paddingLeft: 12 }}>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>{pillar.rewrite || ""}</p>
          </div>
        </div>
      </div>

      {/* benchmark */}
      {pillar.benchmark && (
        <div className="px-6 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)" }}>
          <p className="text-[11px] text-white/35 leading-relaxed">
            <span className="text-white/50 font-medium">Benchmark:</span>{" "}{pillar.benchmark}
          </p>
        </div>
      )}

      {/* fix button */}
      <div className="px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        {tier === "free" ? (
          <a
            href="/pricing"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 500, color: "rgba(6,182,212,0.75)",
              textDecoration: "none", transition: "color 0.15s",
            }}
          >
            <Sparkles size={13} />
            Upgrade to Pro to unlock Fix this for me
          </a>
        ) : (
        <button
          onClick={handleFix}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.55)",
            background: "rgba(255,255,255,0.04)",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.18)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)"; }}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating fixes...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 shrink-0" />
              Fix this for me
            </>
          )}
        </button>
        )}
      </div>

      {/* fix results */}
      {fixes && (
        <div className="px-6 py-5 space-y-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">Ready to Use</p>
          <div className="space-y-4">
            {fixes.map((fix, i) => (
              <div key={i} className="space-y-2">
                <p className="text-xs text-white/55 leading-relaxed">{fix.advice}</p>
                {fix.copy && (
                  <div className="flex items-start gap-2">
                    <div
                      className="flex-1 text-xs text-white/70 leading-relaxed rounded-lg px-3 py-2.5"
                      style={{ background: "#1a1a24", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      {fix.copy}
                    </div>
                    <button
                      onClick={() => handleCopy(fix.copy, i)}
                      className="shrink-0 mt-0.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors"
                      style={{
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: copiedIndex === i ? "#06b6d4" : "rgba(255,255,255,0.4)",
                        background: copiedIndex === i ? "rgba(6,182,212,0.06)" : "transparent",
                      }}
                    >
                      {copiedIndex === i ? "Copied!" : "Copy"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </PremiumCard>
  );
}

/* ── sidebar ────────────────────────────────────────────────── */

function Sidebar({ url, grade, gColor, activeSection, onSectionChange, tabs }: {
  url: string; grade: string; gColor: string;
  activeSection: string;
  onSectionChange: (id: string) => void;
  tabs: { id: Tab; label: string }[];
}) {
  let displayDomain = url;
  try { displayDomain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname; } catch {}

  return (
    <div
      className="hidden md:flex flex-col print:hidden siteiq-sidebar"
      style={{
        position: "fixed", top: 76, left: 0,
        width: 200, height: "calc(100vh - 76px)",
        background: "#0d0d14",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        zIndex: 30, overflowY: "auto",
      }}
    >
      {/* identity */}
      <div style={{ padding: "20px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <SiteIQLogo size={18} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>SiteIQ</span>
        </div>
        <p style={{
          fontSize: 11, color: "rgba(255,255,255,0.35)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          marginBottom: 6,
        }}>
          {displayDomain}
        </p>
        <div style={{ fontSize: 36, fontWeight: 500, color: gColor, lineHeight: 1 }}>{grade}</div>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

      {/* nav */}
      <nav style={{ flex: 1, paddingTop: 6, paddingBottom: 12 }}>
        {tabs.map((t) => {
          const isActive = activeSection === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSectionChange(t.id)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "9px 16px",
                paddingLeft: isActive ? 14 : 16,
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
                background: isActive ? "rgba(6,182,212,0.07)" : "transparent",
                borderLeft: isActive ? "2px solid #06b6d4" : "2px solid transparent",
                borderTop: "none", borderRight: "none", borderBottom: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ── mobile tab bar ─────────────────────────────────────────── */

function MobileTabBar({ activeSection, onSectionChange, tabs }: {
  activeSection: string;
  onSectionChange: (id: string) => void;
  tabs: { id: Tab; label: string }[];
}) {
  return (
    <div
      className="flex md:hidden print:hidden hide-scrollbar siteiq-mobile-tabbar"
      style={{
        position: "sticky", top: 76, zIndex: 40,
        background: "rgba(10,10,15,0.95)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        overflowX: "auto",
        backdropFilter: "blur(12px)",
      }}
    >
      {tabs.map((t) => {
        const isActive = activeSection === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSectionChange(t.id)}
            style={{
              flexShrink: 0,
              padding: "12px 14px",
              fontSize: 13,
              fontWeight: isActive ? 500 : 400,
              color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
              background: "transparent",
              borderTop: "none", borderLeft: "none", borderRight: "none",
              borderBottom: isActive ? "2px solid #06b6d4" : "2px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── top bar ────────────────────────────────────────────────── */

function TopBar({ url, date, onExport, tier }: { url: string; date: string; onExport: () => void; tier: Tier }) {
  let displayDomain = url;
  try { displayDomain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname; } catch {}

  return (
    <div
      className="print:hidden siteiq-topbar"
      style={{
        position: "sticky", top: 76, zIndex: 40, height: 52,
        background: "rgba(10,10,15,0.9)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.65)" }}>{displayDomain}</span>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>·</span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{date}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <a
          href="/"
          style={{
            fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.5)",
            padding: "5px 12px", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6, textDecoration: "none", transition: "all 0.15s",
          }}
        >
          New audit
        </a>
        {tier === "free" ? (
          <a
            href="/pricing"
            style={{
              fontSize: 12, fontWeight: 500, color: "rgba(6,182,212,0.7)",
              padding: "5px 12px", border: "1px solid rgba(6,182,212,0.2)",
              borderRadius: 6, textDecoration: "none", transition: "all 0.15s",
              background: "rgba(6,182,212,0.05)",
            }}
          >
            PDF — Upgrade to Pro
          </a>
        ) : (
          <button
            onClick={onExport}
            style={{
              fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.85)",
              padding: "5px 12px", background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 6, cursor: "pointer", transition: "all 0.15s",
            }}
          >
            Export PDF
          </button>
        )}
      </div>
    </div>
  );
}

/* ── overview tab ───────────────────────────────────────────── */

function OverviewTab({ audit }: { audit: AuditResultV2 }) {
  const grade = audit.overallGrade.toUpperCase();
  const gColor = gradeColor(grade);

  return (
    <div style={{ maxWidth: 760 }}>
      {/* grade + pillar mini rows */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 40, marginBottom: 28 }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 96, fontWeight: 500, color: gColor, lineHeight: 1 }}>{grade}</div>
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
            Overall Grade
          </p>
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingTop: 10 }}>
          {audit.pillars.map((p) => <PillarMiniRow key={p.name} pillar={p} />)}
        </div>
      </div>

      {/* revenue insight card */}
      {audit.revenueImpact && (
        <div
          style={{
            background: "#111118", borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.07)",
            borderLeft: "3px solid #06b6d4",
            padding: "14px 18px", marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#06b6d4", marginBottom: 6, fontWeight: 600 }}>
            Revenue Insight
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{audit.revenueImpact}</p>
        </div>
      )}

      {/* classification tags */}
      <div className="flex flex-wrap gap-1.5">
        {[audit.classification.siteType, audit.classification.targetCustomer, audit.classification.primaryGoal]
          .filter(Boolean).map((tag) => (
            <span
              key={tag}
              style={{
                padding: "4px 12px", borderRadius: 999,
                fontSize: 11, color: "rgba(255,255,255,0.4)",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {tag}
            </span>
          ))}
      </div>
    </div>
  );
}

/* ── results view ───────────────────────────────────────────── */

function ResultsView({ audit, url, screenshot, tier }: { audit: AuditResultV2; url: string; screenshot: string | null; tier: Tier }) {
  const [activeSection, setActiveSection] = useState<string>("overview");
  const programmaticScroll = useRef(false);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const grade = audit.overallGrade.toUpperCase();
  const gColor = gradeColor(grade);
  const rawAnnotations = [...(audit.visualAnnotations ?? [])].sort((a, b) => a.y - b.y);
  const sortedAnnotations = resolveAnnotationOverlaps(rawAnnotations);
  const hasAnnotations = !!(screenshot && sortedAnnotations.length > 0);

  const annMap: Record<string, number> = {};
  sortedAnnotations.forEach((ann, i) => { if (ann.refSection) annMap[ann.refSection] = i; });

  function getAnn(refKey: string) {
    const idx = annMap[refKey];
    if (idx === undefined) return { annNumber: null, annType: null };
    return { annNumber: idx + 1, annType: sortedAnnotations[idx].type };
  }

  function navigateTo(id: string) {
    setActiveSection(id);
    programmaticScroll.current = true;
    if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  const auditDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const visibleTabs = hasAnnotations ? TABS : TABS.filter((t) => t.id !== "visual");

  useEffect(() => {
    const sectionIds = visibleTabs.map((t) => t.id);
    const visible = new Set<string>();

    const observers = sectionIds.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) { visible.add(id); } else { visible.delete(id); }
          if (programmaticScroll.current) return;
          const first = sectionIds.find((s) => visible.has(s));
          if (first) setActiveSection(first);
        },
        { rootMargin: "-128px 0px -45% 0px" }
      );
      obs.observe(el);
      return obs;
    });

    function onScroll() {
      if (programmaticScroll.current) {
        if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
        scrollEndTimer.current = setTimeout(() => { programmaticScroll.current = false; }, 150);
        return;
      }
      const atBottom = window.scrollY + window.innerHeight >= document.body.scrollHeight - 60;
      if (atBottom) setActiveSection(sectionIds[sectionIds.length - 1]);
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observers.forEach((o) => o?.disconnect());
      window.removeEventListener("scroll", onScroll);
      if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnnotations]);

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh" }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

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

      <Sidebar url={url} grade={grade} gColor={gColor} activeSection={activeSection} onSectionChange={navigateTo} tabs={visibleTabs} />

      {/* main area */}
      <div className="md:ml-[200px] siteiq-main print:ml-0" style={{ animation: "siteiq-fadein 0.35s ease-out both" }}>
        <MobileTabBar activeSection={activeSection} onSectionChange={navigateTo} tabs={visibleTabs} />
        <TopBar url={url} date={auditDate} onExport={() => window.print()} tier={tier} />

        {/* all sections — single scrollable layout */}
        <div className="px-6 py-8 print:hidden space-y-16" style={{ paddingBottom: "50vh" }}>

          <section id="overview" style={{ scrollMarginTop: 148 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: 20 }}>Overview</p>
            <OverviewTab audit={audit} />
          </section>

          {hasAnnotations && (
            <section id="visual" className="max-w-5xl" style={{ scrollMarginTop: 148 }}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: 20 }}>Visual Analysis</p>
              <SplitAnnotationPanel screenshot={screenshot!} annotations={sortedAnnotations} url={url} />
            </section>
          )}

          <section id="fixes" className="max-w-3xl" style={{ scrollMarginTop: 148 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: 20 }}>Top Fixes</p>
            <div className="space-y-4">
              {audit.topFixes.map((fix, i) => {
                const { annNumber, annType } = getAnn(`fix${i + 1}`);
                return <FixCard key={i} index={i} fix={fix} annNumber={annNumber} annType={annType} isHighlighted={false} />;
              })}
            </div>
          </section>

          <section id="pillars" className="max-w-5xl" style={{ scrollMarginTop: 148 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: 20 }}>Pillar Breakdown</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {audit.pillars.map((pillar) => {
                const { annNumber, annType } = getAnn(pillar.name);
                return <PillarCard key={pillar.name} pillar={pillar} annNumber={annNumber} annType={annType} isHighlighted={false} tier={tier} />;
              })}
            </div>
          </section>

          <section id="fivesecond" className="max-w-4xl" style={{ scrollMarginTop: 148 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: 20 }}>Five-Second Test</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FiveSecondCard label="What It Does" score={audit.fiveSecondTest.whatItDoes.score} quote={audit.fiveSecondTest.whatItDoes.quote} finding={audit.fiveSecondTest.whatItDoes.finding} />
              <FiveSecondCard label="Who It's For" score={audit.fiveSecondTest.whoItsFor.score} quote={audit.fiveSecondTest.whoItsFor.quote} finding={audit.fiveSecondTest.whoItsFor.finding} />
              <FiveSecondCard label="What To Do" score={audit.fiveSecondTest.whatToDo.score} quote={audit.fiveSecondTest.whatToDo.quote} finding={audit.fiveSecondTest.whatToDo.finding} />
            </div>
          </section>

        </div>

        {/* print-only full content */}
        <div className="hidden print:block px-8 space-y-12">
          <OverviewTab audit={audit} />
          {hasAnnotations && (
            <SplitAnnotationPanel screenshot={screenshot!} annotations={sortedAnnotations} url={url} />
          )}
          <div className="space-y-4">
            {audit.topFixes.map((fix, i) => {
              const { annNumber, annType } = getAnn(`fix${i + 1}`);
              return <FixCard key={i} index={i} fix={fix} annNumber={annNumber} annType={annType} isHighlighted={false} />;
            })}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {audit.pillars.map((pillar) => {
              const { annNumber, annType } = getAnn(pillar.name);
              return <PillarCard key={pillar.name} pillar={pillar} annNumber={annNumber} annType={annType} isHighlighted={false} tier={tier} />;
            })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FiveSecondCard label="What It Does" score={audit.fiveSecondTest.whatItDoes.score} quote={audit.fiveSecondTest.whatItDoes.quote} finding={audit.fiveSecondTest.whatItDoes.finding} />
            <FiveSecondCard label="Who It's For" score={audit.fiveSecondTest.whoItsFor.score} quote={audit.fiveSecondTest.whoItsFor.quote} finding={audit.fiveSecondTest.whoItsFor.finding} />
            <FiveSecondCard label="What To Do" score={audit.fiveSecondTest.whatToDo.score} quote={audit.fiveSecondTest.whatToDo.quote} finding={audit.fiveSecondTest.whatToDo.finding} />
          </div>
        </div>

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
  const siteColor = gradeColor(siteGrade);

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
    <div className="min-h-screen print:min-h-0" style={{ background: "#0a0a0f" }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      <div className="sticky top-[76px] z-40 backdrop-blur-md border-b print:hidden" style={{ background: "rgba(10,10,15,0.85)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center gap-3">
          <span className="text-sm font-medium tabular-nums" style={{ color: siteColor }}>{siteGrade}</span>
          <span className="text-white/20">·</span>
          <span className="text-sm text-white/40">Site Overview · {pages.length} pages audited</span>
          <div className="flex-1" />
          <a href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors">New audit</a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16 space-y-16">
        <div className="flex items-start gap-10">
          <div>
            <div className="leading-none font-light" style={{ fontSize: 80, color: siteColor, lineHeight: 1 }}>{siteGrade}</div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 font-medium mt-3">Site Grade</p>
          </div>
          <div className="pt-2">
            <p className="text-xl font-semibold text-white/85">
              {siteGrade === "A" ? "Excellent across the board" :
               siteGrade === "B" ? "Strong performance, a few gaps" :
               siteGrade === "C" ? "Room for improvement" :
               siteGrade === "D" ? "Significant issues found" :
               "Critical issues. Act now."}
            </p>
            <p className="text-sm text-white/40 mt-1.5">
              Average across {pages.length} audited page{pages.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/30 mb-5">Page Comparison</h2>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">Page</th>
                  <th className="text-center px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-white/30 w-20">Grade</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">Top Issue</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page, idx) => {
                  const g = (page.audit.overallGrade ?? "F").toUpperCase();
                  const color = gradeColor(g);
                  const topFix = page.audit.topFixes?.[0];
                  return (
                    <tr
                      key={page.url}
                      className="transition-colors"
                      style={{ borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    >
                      <td className="px-5 py-3.5 font-mono text-sm text-white/60">{pagePath(page.url)}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-sm font-medium tabular-nums" style={{ color }}>{g}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-white/35 max-w-xs">{topFix ? topFix.fix : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {wins.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/30 mb-1.5">Biggest Wins Across Your Site</h2>
            <p className="text-sm text-white/40 mb-6">The highest-impact fixes to prioritize first</p>
            <div className="space-y-3">
              {wins.map(({ fix, pageUrl }, i) => {
                const d = DIFFICULTY[fix.difficulty] ?? DIFFICULTY.medium;
                return (
                  <PremiumCard key={i} className="flex gap-5 items-start px-6 py-5">
                    <div
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white/60"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-sm font-semibold text-white/85 leading-snug">{fix.fix}</p>
                      <p className="text-xs text-white/40">{fix.impact}</p>
                      <p className="text-[11px] text-white/25 font-mono">{pagePath(pageUrl)}</p>
                    </div>
                    <span className="shrink-0 self-start mt-0.5 flex items-center gap-1.5 text-[11px] text-white/35">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: d.dot }} />
                      {d.label}
                    </span>
                  </PremiumCard>
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

function MultiPageView({ pages, url, tier }: { pages: PageResult[]; url: string; tier: Tier }) {
  const [activeTab, setActiveTab] = useState(0);

  function tabLabel(pageUrl: string) {
    try { return new URL(pageUrl).pathname || "/"; } catch { return pageUrl; }
  }

  return (
    <div>
      <div className="sticky top-[76px] z-40 backdrop-blur-md border-b" style={{ background: "rgba(10,10,15,0.92)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center gap-1 overflow-x-auto py-0 hide-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab(0)}
              className={cn(
                "shrink-0 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === 0 ? "border-white/40 text-white/80" : "border-transparent text-white/35 hover:text-white/60"
              )}
            >
              Site Overview
            </button>
            {pages.map((page, i) => {
              const g = (page.audit.overallGrade ?? "F").toUpperCase();
              const color = gradeColor(g);
              return (
                <button
                  key={page.url}
                  type="button"
                  onClick={() => setActiveTab(i + 1)}
                  className={cn(
                    "shrink-0 flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    activeTab === i + 1 ? "border-white/40 text-white/80" : "border-transparent text-white/35 hover:text-white/60"
                  )}
                >
                  <span className="font-mono">{tabLabel(page.url)}</span>
                  <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>{g}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeTab === 0 ? (
        <SiteOverview pages={pages} />
      ) : (
        <ResultsView audit={pages[activeTab - 1].audit} url={pages[activeTab - 1].url} screenshot={pages[activeTab - 1].screenshot} tier={tier} />
      )}
    </div>
  );
}

/* ── main export ────────────────────────────────────────────── */

export default function ResultsClient({ url, urls, tier = "free" }: { url: string; urls?: string; tier?: Tier }) {
  const isMultiPage = !!urls;
  const storageKey = isMultiPage
    ? `siteiq_audit_ids:${urls}`
    : `siteiq_audit_id:${url}`;

  const [initialCachedId] = useState<string | null>(() => {
    try {
      const val = sessionStorage.getItem(storageKey);
      console.log("[SiteIQ] lazy init sessionStorage read:", storageKey, "→", val);
      return val;
    } catch { return null; }
  });
  const restoredFromCache = !!initialCachedId;
  const [cacheRestoreFailed, setCacheRestoreFailed] = useState(false);

  const [phase, setPhase] = useState<"loading" | "results" | "error">("loading");
  const [audit, setAudit] = useState<AuditResultV2 | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [pages, setPages] = useState<PageResult[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(5);

  useEffect(() => {
    if (!restoredFromCache || !initialCachedId) return;
    let cancelled = false;
    async function restore() {
      const restoreUrl = isMultiPage
        ? `/api/audit/restore?ids=${encodeURIComponent(initialCachedId!)}`
        : `/api/audit/restore?id=${encodeURIComponent(initialCachedId!)}`;
      try {
        const res = await fetch(restoreUrl);
        if (res.ok && !cancelled) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const restored: any = await res.json();
          if (isMultiPage ? restored.pages?.length > 0 : !!restored.audit) {
            setProgress(100);
            if (isMultiPage) {
              setPages(restored.pages);
            } else {
              setAudit(restored.audit);
              setScreenshot(restored.screenshot ?? null);
            }
            setPhase("results");
            return;
          }
        }
      } catch {}
      if (!cancelled) {
        try { sessionStorage.removeItem(storageKey); } catch {}
        setCacheRestoreFailed(true);
      }
    }
    restore();
    return () => { cancelled = true; };
  }, [restoredFromCache, initialCachedId, isMultiPage, storageKey]);

  useEffect(() => {
    if (restoredFromCache && !cacheRestoreFailed) return;
    let cancelled = false;
    let prog = 5;
    let tick: ReturnType<typeof setInterval> | null = null;

    function startProgress() {
      tick = setInterval(() => {
        prog = Math.min(prog + 1.5, 88);
        if (!cancelled) setProgress(prog);
      }, 1200);
    }

    async function run() {
      // 1. Check 24h DB cache for logged-in users
      try {
        const cacheUrl = isMultiPage
          ? `/api/audit/cached?urls=${encodeURIComponent(urls!)}`
          : `/api/audit/cached?url=${encodeURIComponent(url)}`;
        const cacheRes = await fetch(cacheUrl);
        if (cacheRes.ok && !cancelled) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cached: any = await cacheRes.json();
          if (cached.hit) {
            setProgress(100);
            if (isMultiPage) {
              setPages(cached.pages);
            } else {
              setAudit(cached.audit);
              setScreenshot(cached.screenshot ?? null);
            }
            setPhase("results");
            return;
          }
        }
      } catch {
        // Cache check failed — proceed with fresh audit
      }

      if (cancelled) return;
      startProgress();

      // 2. Run a fresh audit
      const fetchUrl = isMultiPage
        ? `/api/audit?urls=${encodeURIComponent(urls!)}`
        : `/api/audit?url=${encodeURIComponent(url)}`;

      let res: Response;
      try {
        res = await fetch(fetchUrl);
      } catch {
        if (!cancelled) { if (tick) clearInterval(tick); setErrorMsg("Network error. Could not reach the server."); setPhase("error"); }
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (!cancelled) { if (tick) clearInterval(tick); setErrorMsg((data as { error?: string }).error ?? `Request failed (${res.status})`); setPhase("error"); }
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();

      if (!cancelled) {
        if (tick) clearInterval(tick);
        setProgress(100);

        // Save audit ID(s) to sessionStorage so refresh restores instead of re-running
        try {
          if (isMultiPage && Array.isArray(data.auditIds) && data.auditIds.every(Boolean)) {
            const ids = (data.auditIds as string[]).join(",");
            sessionStorage.setItem(storageKey, ids);
            console.log("[SiteIQ] sessionStorage saved (multi):", storageKey, "→", ids);
          } else if (!isMultiPage && data.auditId) {
            sessionStorage.setItem(storageKey, data.auditId as string);
            console.log("[SiteIQ] sessionStorage saved:", storageKey, "→", data.auditId);
          } else {
            console.log("[SiteIQ] sessionStorage NOT saved — auditId missing. data:", JSON.stringify(data).slice(0, 200));
          }
        } catch { /* sessionStorage not available */ }

        if (isMultiPage) {
          setPages((data.pages ?? []).map((p: { url: string; data: AuditResultV2; screenshot: string | null }) => ({
            url: p.url, audit: p.data, screenshot: p.screenshot,
          })));
        } else {
          setAudit(data.audit);
          setScreenshot(data.screenshot ?? null);
        }
        setPhase("results");
      }
    }

    run();
    return () => { cancelled = true; if (tick) clearInterval(tick); };
  }, [url, urls, isMultiPage, restoredFromCache, cacheRestoreFailed]);

  if (phase === "error") {
    return (
      <div className="min-h-[calc(100vh-76px)] flex items-center justify-center px-6" style={{ background: "#0a0a0f" }}>
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl" style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>×</div>
          <h2 className="text-lg font-semibold text-white/80">Audit failed</h2>
          <p className="text-sm text-white/40 leading-relaxed">{errorMsg}</p>
          <a href="/" className="text-sm text-white/50 hover:text-white/80 transition-colors">← Try another URL</a>
        </div>
      </div>
    );
  }

  if (phase === "loading") return <LoadingView progress={progress} />;

  if (isMultiPage && pages.length > 0) {
    return <MultiPageView pages={pages} url={url} tier={tier} />;
  }

  if (audit) return <ResultsView audit={audit} url={url} screenshot={screenshot} tier={tier} />;
  return null;
}
