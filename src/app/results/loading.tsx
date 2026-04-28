export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center px-6 bg-background">
      <div className="flex flex-col items-center gap-10 w-full max-w-xs text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shadow-lg">
            <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
              <path d="M2 4L6 13L9 7L12 13L16 4" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
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
