"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import type { AuditResultV2, PillarResultV2, TopFix, VisualAnnotation } from "@/lib/auditor";
import { cn } from "@/lib/utils";
import SiteIQLogo from "@/components/SiteIQLogo";
import { AnimatedBlobs } from "@/components/ui/blobs";
import { CanvasRevealEffect } from "@/components/ui/sign-in-flow-1";

/* ── multi-page types ───────────────────────────────────────── */

type PageResult = { url: string; audit: AuditResultV2; screenshot: string | null };

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
  .premium-card {
    background: linear-gradient(160deg, #111118 0%, #1a1a24 100%);
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
  .premium-card::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: 16px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    opacity: 0.035;
    mix-blend-mode: overlay;
    z-index: 0;
  }
  .premium-card > * { position: relative; z-index: 1; }
  .siteiq-highlight {
    border-color: rgba(255,255,255,0.18) !important;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 4px 20px rgba(0,0,0,0.5) !important;
  }
  @media print {
    .premium-card {
      background: #fff !important;
      border: 1px solid #e5e7eb !important;
      box-shadow: none !important;
      transform: none !important;
    }
    .premium-card::before { display: none; }
  }
`;

/* ── score helpers ──────────────────────────────────────────── */

function sc(score: number) {
  if (score >= 8) return { tier: "good" as const,     hex: "#6ee7b7", textCls: "text-[#6ee7b7]", label: "Good" };
  if (score >= 5) return { tier: "warning" as const,  hex: "#d97706", textCls: "text-[#d97706]", label: "Needs work" };
  return {           tier: "critical" as const,        hex: "#f87171", textCls: "text-[#f87171]", label: "Critical" };
}

function gradeColor(grade: string): string {
  if (grade === "A" || grade === "B") return "#6ee7b7";
  if (grade === "C") return "#d97706";
  return "#f87171";
}

function getScoreColor(score: number): string { return sc(score).hex; }

/* ── difficulty ─────────────────────────────────────────────── */

const DIFFICULTY: Record<string, { label: string; dot: string }> = {
  easy:   { label: "Easy",   dot: "#6ee7b7" },
  medium: { label: "Medium", dot: "#d97706" },
  hard:   { label: "Hard",   dot: "#f87171" },
};

/* ── annotation type colors ─────────────────────────────────── */

const ANN_TYPE: Record<VisualAnnotation["type"], { border: string; badge: string; dot: string }> = {
  critical: { border: "#f87171", badge: "#f87171", dot: "bg-[#f87171]" },
  warning:  { border: "#d97706", badge: "#d97706", dot: "bg-[#d97706]" },
  good:     { border: "#6ee7b7", badge: "#6ee7b7", dot: "bg-[#6ee7b7]" },
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

      // border only, no fill, rounded corners
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
                boxShadow: `0 1px 5px rgba(0,0,0,0.55), 0 0 10px ${s.badge}cc, 0 0 20px ${s.badge}55`,
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

      {/* split panel */}
      <div className="flex rounded-xl overflow-hidden border border-white/[0.07]" style={{ height: 620 }}>

        {/* ── left: screenshot (60%) ── */}
        <div className="relative overflow-auto" style={{ flex: "0 0 60%", background: "#0a0a0f" }}>
          <div className="relative block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${screenshot}`}
              alt="Page screenshot with annotations"
              className="block w-full h-auto select-none"
              draggable={false}
            />

            {/* scan line on load */}
            {!scanDone && (
              <div
                className="absolute left-0 right-0 pointer-events-none z-20"
                style={{
                  height: 2,
                  top: 0,
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 15%, rgba(255,255,255,0.4) 85%, transparent 100%)",
                  boxShadow: "0 0 18px 8px rgba(255,255,255,0.1)",
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
                    border: `2px solid ${s.border}`,
                    borderRadius: 10,
                    opacity: isDimmed ? 0.25 : 1,
                    transition: "opacity 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                    boxShadow: isSelected
                      ? `0 0 0 2px ${s.badge}40, 0 0 20px ${s.badge}20`
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
                  <span
                    className="absolute flex items-center justify-center rounded-full text-white font-bold select-none pointer-events-none"
                    style={{
                      width: 22,
                      height: 22,
                      fontSize: 12,
                      lineHeight: 1,
                      top: 4,
                      left: 4,
                      background: s.badge,
                      boxShadow: "0 1px 5px rgba(0,0,0,0.55)",
                      transform: isSelected ? "scale(1.2)" : "scale(1)",
                      transition: "transform 0.15s ease, background 0.15s ease",
                    }}
                  >
                    {i + 1}
                  </span>

                  {/* teal pulse ring, active only */}
                  {isSelected && (
                    <div
                      className="absolute inset-0 rounded-[10px] pointer-events-none"
                      style={{
                        border: `2px solid ${s.badge}`,
                        animation: "siteiq-box-pulse 1.8s ease-in-out infinite",
                      }}
                    />
                  )}

                  {/* hover tooltip */}
                  {isHovered && (
                    <div
                      className="absolute z-50 pointer-events-none rounded-lg shadow-2xl"
                      style={{
                        background: "#111118",
                        color: "white",
                        padding: "6px 10px",
                        maxWidth: 220,
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        border: `1px solid ${s.badge}33`,
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

        {/* divider */}
        <div className="w-px shrink-0" style={{ background: "rgba(255,255,255,0.07)" }} />

        {/* ── right: findings list (40%) ── */}
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
                {/* collapsed header, always visible */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span
                    className="shrink-0 flex items-center justify-center rounded-full text-white font-bold text-xs"
                    style={{
                      width: 22,
                      height: 22,
                      background: s.badge,
                      opacity: isActive ? 1 : 0.7,
                      transition: "opacity 0.15s ease",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-medium text-white/80 truncate">
                    {ann.label}
                  </span>
                  <span className="shrink-0 flex items-center gap-1.5 text-[10px] text-white/40 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.badge }} />
                    {ann.type}
                  </span>
                  <svg
                    className="shrink-0 w-3.5 h-3.5 text-white/30"
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

                {/* expanded content, spring slide down */}
                {isExpanded && (
                  <div
                    className="px-4 pb-4"
                    style={{ animation: "siteiq-slide-spring 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
                  >
                    <p className="text-xs text-white/50 leading-relaxed" style={{ paddingLeft: 34 }}>
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
      <div className="absolute inset-0 overflow-hidden">
        <AnimatedBlobs />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-[280px] text-center">
        <div className="flex flex-col items-center gap-2">
          <SiteIQLogo size={40} className="opacity-90" />
          <span className="text-sm font-medium tracking-wide text-white/50">SiteIQ</span>
        </div>
        <div className="w-full space-y-3">
          <h2 className="text-base font-semibold text-white/80">
            {pageInfo ? `Auditing page ${pageInfo.current} of ${pageInfo.total}` : "Analyzing your site"}
          </h2>
          {pageInfo && pageInfo.total > 1 && (
            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: pageInfo.total }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i < pageInfo.current ? 20 : 6,
                    height: 6,
                    background: i < pageInfo.current ? "#6ee7b7" : "rgba(255,255,255,0.12)",
                  }}
                />
              ))}
            </div>
          )}
          <div className="w-full h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg,#2563eb,#6ee7b7)",
                transition: "width 0.4s ease",
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

/* ── section heading ────────────────────────────────────────── */

function SectionHeading({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-4 mb-8">
      <div
        data-print="section-num"
        className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-mono font-semibold mt-0.5"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
      >
        {number}
      </div>
      <div>
        <h2 className="text-base font-semibold text-white/90 tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-white/40 mt-0.5 leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ── pillar mini bar (used in score overview) ────────────────── */

function PillarMiniBar({ pillar }: { pillar: PillarResultV2 }) {
  const s = sc(pillar.score);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-white/35 truncate">{pillar.name}</p>
        <p className="text-[11px] font-semibold tabular-nums shrink-0" style={{ color: s.hex }}>
          {pillar.score}<span className="text-white/25 font-normal">/10</span>
        </p>
      </div>
      <div className="h-[2px] rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full" style={{ width: `${pillar.score * 10}%`, background: s.hex, opacity: 0.7 }} />
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
    <PremiumCard className="p-6 flex flex-col gap-4 break-inside-avoid">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">{label}</p>
        <div className="flex items-baseline gap-0.5 shrink-0">
          <span className="text-3xl font-light leading-none tabular-nums" style={{ color: s.hex }}>
            {score}
          </span>
          <span className="text-xs text-white/30 mb-0.5">/10</span>
        </div>
      </div>
      <div className="h-[2px] rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full" style={{ width: `${score * 10}%`, background: s.hex, opacity: 0.65 }} />
      </div>
      {quote && (
        <blockquote
          data-print="issue-quote"
          className="pl-3 italic text-xs text-white/55 leading-relaxed"
          style={{ borderLeft: `2px solid ${s.hex}55` }}
        >
          &ldquo;{quote}&rdquo;
        </blockquote>
      )}
      <p className="text-xs text-white/45 leading-relaxed">{finding}</p>
    </PremiumCard>
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
    <PremiumCard
      id={annNumber != null ? `audit-ann-${annNumber - 1}` : undefined}
      className={cn("flex gap-5 items-start px-6 py-5 break-inside-avoid", isHighlighted && "siteiq-highlight")}
      style={{ scrollMarginTop: "140px" }}
    >
      <div
        data-print="fix-num"
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white/70"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {index + 1}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-sm font-semibold text-white/85 leading-snug flex items-center gap-1.5 flex-wrap">
          {fix.fix}
          {annNumber != null && annType != null && <AnnBadge number={annNumber} type={annType} />}
        </p>
        <p className="text-xs text-white/40 leading-relaxed">{fix.impact}</p>
      </div>
      <span
        data-difficulty={fix.difficulty}
        className="shrink-0 self-start mt-0.5 flex items-center gap-1.5 text-[11px] text-white/40"
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: d.dot }} />
        {d.label}
      </span>
    </PremiumCard>
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
      if (res.ok && Array.isArray(data.fixes)) {
        setFixes(data.fixes);
      }
    } catch {
      // silent failure, button returns to default state
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
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <p data-print="rewrite-label" className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
            Suggested Rewrite
          </p>
          <p className="text-xs text-white/60 leading-relaxed">{pillar.rewrite || ""}</p>
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
                        color: copiedIndex === i ? "#6ee7b7" : "rgba(255,255,255,0.4)",
                        background: copiedIndex === i ? "rgba(110,231,183,0.06)" : "transparent",
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

/* ── dot matrix background ──────────────────────────────────── */

function DotBackground({ pillars, grade }: { pillars: PillarResultV2[]; grade: string }) {
  const tierColorMap: Record<string, [number, number, number]> = {
    good:     [110, 231, 183],
    warning:  [215, 119, 6],
    critical: [248, 113, 113],
  };

  const presentTiers = [...new Set(pillars.map(p => sc(p.score).tier))];
  const colors: [number, number, number][] = presentTiers.map(t => tierColorMap[t]);
  if (colors.length === 0) {
    const fallbackTier = (grade === "A" || grade === "B") ? "good" : grade === "C" ? "warning" : "critical";
    colors.push(tierColorMap[fallbackTier]);
  }

  const total = Math.max(pillars.length, 1);
  const goodPct  = pillars.filter(p => sc(p.score).tier === "good").length / total;
  const warnPct  = pillars.filter(p => sc(p.score).tier === "warning").length / total;
  const critPct  = pillars.filter(p => sc(p.score).tier === "critical").length / total;

  return (
    <div className="fixed inset-0 pointer-events-none select-none print:hidden" style={{ zIndex: 0 }}>
      <CanvasRevealEffect
        animationSpeed={2.5}
        containerClassName="bg-[#0a0a0f]"
        colors={colors}
        opacities={[0.03, 0.04, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.13]}
        dotSize={3}
        showGradient={false}
      />
      {/* spatial color pools positioned per score tier */}
      {goodPct > 0 && (
        <div className="absolute" style={{
          top: "-5%", right: "-5%", width: "55%", height: "55%",
          background: `radial-gradient(ellipse at center, rgba(110,231,183,${(goodPct * 0.09).toFixed(3)}) 0%, transparent 70%)`,
        }} />
      )}
      {warnPct > 0 && (
        <div className="absolute" style={{
          top: "25%", left: "-5%", width: "50%", height: "55%",
          background: `radial-gradient(ellipse at center, rgba(215,119,6,${(warnPct * 0.09).toFixed(3)}) 0%, transparent 70%)`,
        }} />
      )}
      {critPct > 0 && (
        <div className="absolute" style={{
          bottom: "5%", right: "5%", width: "50%", height: "45%",
          background: `radial-gradient(ellipse at center, rgba(248,113,113,${(critPct * 0.09).toFixed(3)}) 0%, transparent 70%)`,
        }} />
      )}
      {/* vignette — keeps text and cards readable */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 80% 65% at 50% 40%, transparent 10%, #0a0a0f 80%)",
      }} />
    </div>
  );
}

/* ── results view ───────────────────────────────────────────── */

function ResultsView({ audit, url, screenshot }: { audit: AuditResultV2; url: string; screenshot: string | null }) {
  const grade = (audit.overallGrade ?? "F").toUpperCase();
  const gColor = gradeColor(grade);
  const rawAnnotations = [...(audit.visualAnnotations ?? [])].sort((a, b) => a.y - b.y);
  const sortedAnnotations = resolveAnnotationOverlaps(rawAnnotations);
  const hasAnnotations = !!(screenshot && sortedAnnotations.length > 0);

  const annMap: Record<string, number> = {};
  sortedAnnotations.forEach((ann, i) => {
    if (ann.refSection) annMap[ann.refSection] = i;
  });

  function getAnn(refKey: string) {
    const idx = annMap[refKey];
    if (idx === undefined) return { annNumber: null, annType: null };
    return { annNumber: idx + 1, annType: sortedAnnotations[idx].type };
  }

  let displayDomain = url;
  try { displayDomain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname; } catch { /* noop */ }

  const auditDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen print:min-h-0" style={{ background: "transparent" }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <DotBackground pillars={audit.pillars ?? []} grade={grade} />
      <div className="relative" style={{ zIndex: 1 }}>

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
      <div className="sticky top-[76px] z-40 backdrop-blur-md border-b print:hidden" style={{ background: "rgba(10,10,15,0.85)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-sm font-medium tabular-nums" style={{ color: gColor }}>{grade}</span>
            <span className="text-white/20">·</span>
            <span className="text-sm text-white/40 truncate hidden sm:block">{displayDomain}</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors">New audit</a>
            <button
              className="text-xs px-3 py-1.5 rounded-md font-medium cursor-pointer transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.05)" }}
              onClick={() => window.print()}
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* score overview header */}
      <div className="border-b print:bg-transparent" style={{ borderColor: "rgba(255,255,255,0.07)", background: "transparent" }}>
        <div className="max-w-5xl mx-auto px-6 py-12 print:py-6">
          <div className="flex flex-col sm:flex-row items-start gap-10 sm:gap-16">

            {/* grade block */}
            <div className="shrink-0">
              <div data-grade={grade} className="leading-none font-light tabular-nums" style={{ fontSize: 96, color: gColor, lineHeight: 1 }}>
                {grade}
              </div>
              <div className="mt-3 space-y-0.5">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-medium">Overall Grade</p>
                <p className="text-sm text-white/50">{displayDomain}</p>
                <p className="text-xs text-white/25">{auditDate}</p>
              </div>
              {audit.revenueImpact && (
                <div
                  data-print="revenue"
                  className="mt-5 rounded-xl px-4 py-3 max-w-[260px]"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <p className="text-xs text-white/50 leading-relaxed">{audit.revenueImpact}</p>
                </div>
              )}
            </div>

            {/* pillar mini grid 2×3 */}
            {(audit.pillars?.length ?? 0) > 0 && (
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-white/25 font-medium mb-5">Pillar Scores</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-5">
                  {audit.pillars.map((p) => (
                    <PillarMiniBar key={p.name} pillar={p} />
                  ))}
                </div>
                {audit.classification && (
                  <div className="flex flex-wrap gap-1.5 mt-8">
                    {[audit.classification.siteType, audit.classification.targetCustomer, audit.classification.primaryGoal]
                      .filter(Boolean).map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 rounded-full text-[11px] text-white/35"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* body */}
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-20 print:space-y-10 print:py-6">

        {/* 01 visual analysis */}
        {hasAnnotations && (
          <section className="print:hidden">
            <SectionHeading
              number="01"
              title="Visual Analysis"
              subtitle="Click an annotation or finding to explore. Hover a box for a quick label."
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
            <SectionHeading number={hasAnnotations ? "03" : "02"} title="Top 3 Revenue Opportunities" subtitle="Ranked by estimated conversion impact. Fix these first." />
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
            <SectionHeading number={hasAnnotations ? "04" : "03"} title="Pillar Analysis" subtitle="Six dimensions of conversion performance, with exact issue and rewrite for each." />
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

      </div>{/* end relative z-1 */}
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

      {/* sticky bar */}
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

        {/* Overall grade */}
        <div className="flex items-start gap-10">
          <div>
            <div className="leading-none font-light" style={{ fontSize: 80, color: siteColor, lineHeight: 1 }}>
              {siteGrade}
            </div>
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

        {/* Page comparison table */}
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
                      style={{
                        borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined,
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    >
                      <td className="px-5 py-3.5 font-mono text-sm text-white/60">{pagePath(page.url)}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-sm font-medium tabular-nums" style={{ color }}>{g}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-white/35 max-w-xs">
                        {topFix ? topFix.fix : ""}
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

function MultiPageView({ pages, url }: { pages: PageResult[]; url: string }) {
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
                activeTab === 0
                  ? "border-white/40 text-white/80"
                  : "border-transparent text-white/35 hover:text-white/60"
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
                    activeTab === i + 1
                      ? "border-white/40 text-white/80"
                      : "border-transparent text-white/35 hover:text-white/60"
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
  const [audit, setAudit] = useState<AuditResultV2 | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [pages, setPages] = useState<PageResult[]>([]);
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
        if (!cancelled) { setErrorMsg("Network error. Could not reach the server."); setPhase("error"); }
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
            const snap = msg.screenshot ?? null;
            setProgress(100);
            setTimeout(() => {
              if (!cancelled) { setAudit(msg.data); setScreenshot(snap); setPhase("results"); }
            }, 500);
          } else if (msg.type === "page_result" && msg.data) {
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
      <div className="min-h-[calc(100vh-76px)] flex items-center justify-center px-6" style={{ background: "#0a0a0f" }}>
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-[#f87171] font-bold text-xl" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)" }}>×</div>
          <h2 className="text-lg font-semibold text-white/80">Audit failed</h2>
          <p className="text-sm text-white/40 leading-relaxed">{errorMsg}</p>
          <a href="/" className="text-sm text-white/50 hover:text-white/80 transition-colors">← Try another URL</a>
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
