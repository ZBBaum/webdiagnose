"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SiteIQLogo from "@/components/SiteIQLogo";

const MAX_PAGES = 10;

// Paths sorted by business importance for pre-selection
const IMPORTANT_PATHS = [
  "/pricing", "/price", "/plans",
  "/about", "/about-us",
  "/contact", "/contact-us",
  "/features", "/product", "/products",
  "/services", "/solutions",
  "/demo", "/trial",
  "/signup", "/sign-up", "/register",
  "/blog",
];

function importanceScore(path: string): number {
  const p = path.toLowerCase();
  const idx = IMPORTANT_PATHS.findIndex((imp) => p === imp || p.startsWith(imp + "/"));
  return idx === -1 ? 999 : idx;
}

function pathLabel(url: string): string {
  try {
    const { pathname } = new URL(url);
    return pathname || "/";
  } catch {
    return url;
  }
}

type PageItem = { url: string; path: string };

export default function SelectClient({ url }: { url: string }) {
  const [discovering, setDiscovering] = useState(true);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/crawl?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then(({ pages: urls, error: apiErr }: { pages?: string[]; error?: string }) => {
        if (apiErr) { setError(apiErr); setDiscovering(false); return; }
        const items: PageItem[] = (urls ?? [url]).map((u) => ({
          url: u,
          path: pathLabel(u),
        }));
        setPages(items);

        // Pre-select homepage + up to 4 most important pages
        const pre = new Set<string>();
        if (items[0]) pre.add(items[0].url);
        const byImportance = [...items.slice(1)].sort(
          (a, b) => importanceScore(a.path) - importanceScore(b.path)
        );
        byImportance.slice(0, 4).forEach((p) => pre.add(p.url));
        setSelected(pre);
        setDiscovering(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to discover pages");
        setDiscovering(false);
      });
  }, [url]);

  function toggle(pageUrl: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pageUrl)) {
        next.delete(pageUrl);
      } else if (next.size < MAX_PAGES) {
        next.add(pageUrl);
      }
      return next;
    });
  }

  function startAudit() {
    const list = [...selected];
    if (list.length === 0) return;
    if (list.length === 1) {
      router.push(`/results?url=${encodeURIComponent(list[0])}`);
    } else {
      router.push(`/results?urls=${encodeURIComponent(list.join(","))}`);
    }
  }

  const hostname = (() => {
    try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname; }
    catch { return url; }
  })();

  return (
    <div
      className="min-h-[calc(100vh-76px)] flex items-center justify-center px-4 py-12"
      style={{ background: "#090909" }}
    >
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <SiteIQLogo size={32} />
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Select pages to audit</h1>
            <p className="text-sm text-white/40">{hostname}</p>
          </div>
        </div>

        {/* Discovery loading */}
        {discovering && (
          <div className="rounded-2xl border border-white/8 bg-white/3 p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
            <div>
              <p className="text-sm font-medium text-white/80">Discovering pages…</p>
              <p className="text-xs text-white/40 mt-1">Scanning internal links on {hostname}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {!discovering && error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center space-y-3">
            <p className="text-sm text-red-400">{error}</p>
            <a href="/" className="text-xs text-white/40 hover:text-white transition-colors">← Try a different URL</a>
          </div>
        )}

        {/* Page list */}
        {!discovering && !error && pages.length > 0 && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/50">
                {pages.length} page{pages.length !== 1 ? "s" : ""} found
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelected(new Set(pages.slice(0, MAX_PAGES).map((p) => p.url)))}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Select all
                </button>
                <span className="text-white/20">·</span>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Deselect all
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden divide-y divide-white/5">
              {pages.map((page) => {
                const isChecked = selected.has(page.url);
                const atLimit = !isChecked && selected.size >= MAX_PAGES;
                return (
                  <label
                    key={page.url}
                    className={[
                      "flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors select-none",
                      isChecked ? "bg-cyan-500/8" : atLimit ? "opacity-40" : "hover:bg-white/3",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                        isChecked
                          ? "border-cyan-500 bg-cyan-500"
                          : "border-white/20 bg-transparent",
                      ].join(" ")}
                    >
                      {isChecked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isChecked}
                      disabled={atLimit}
                      onChange={() => toggle(page.url)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-white/90 font-mono">{page.path}</span>
                    </div>
                    {page.path === "/" && (
                      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                        Homepage
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Selection count + limit note */}
            <div className="flex items-center justify-between text-xs text-white/35 px-1">
              <span>{selected.size} of {Math.min(pages.length, MAX_PAGES)} selected</span>
              <span>Pro: up to 5 pages · Agency: up to 10 pages</span>
            </div>

            {/* Start Audit */}
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={startAudit}
              className="w-full h-12 rounded-xl bg-gradient-to-b from-cyan-500 to-cyan-600 text-white text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-cyan-600 hover:to-cyan-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {selected.size === 0
                ? "Select at least one page"
                : selected.size === 1
                ? "Start Audit (1 page)"
                : `Start Audit (${selected.size} pages)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
