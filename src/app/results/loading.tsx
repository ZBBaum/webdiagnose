import SiteIQLogo from "@/components/SiteIQLogo";

export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-76px)] flex items-center justify-center px-6">
      <style>{`
        @keyframes siteiq-logo-glow {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(6,182,212,0.25)); }
          50% { filter: drop-shadow(0 0 18px rgba(6,182,212,0.65)); }
        }
      `}</style>
      <div
        className="flex flex-col items-center gap-10 w-full max-w-xs text-center"
        style={{ marginTop: -50 }}
      >
        <div className="flex flex-col items-center gap-3">
          <div style={{ animation: "siteiq-logo-glow 2.2s ease-in-out infinite" }}>
            <SiteIQLogo size={48} />
          </div>
          <span className="text-sm font-semibold text-foreground">SiteIQ</span>
        </div>
        <div className="w-full space-y-3.5">
          <h2 className="text-lg font-semibold text-foreground">Analyzing your site</h2>
          <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-0 w-0" />
          </div>
          <p className="text-sm text-muted-foreground">Starting analysis…</p>
        </div>
      </div>
    </div>
  );
}
