import { ArrowRight, Zap, Layers, Unlock } from "lucide-react";

const PILLS = [
  { icon: Zap, label: "15-second analysis" },
  { icon: Layers, label: "6 conversion pillars" },
  { icon: Unlock, label: "No signup required" },
];

export default function Home() {
  return (
    <main className="relative min-h-[calc(100vh-76px)] flex items-center justify-center overflow-hidden">

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none select-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(128 128 128 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(128 128 128 / 0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Violet bloom */}
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-violet-500/10 dark:bg-violet-500/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center text-center gap-8 px-6 py-24">

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-background/80 backdrop-blur-md text-xs font-medium text-muted-foreground shadow-sm">
          <span className="relative flex size-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-500 opacity-60" />
            <span className="relative inline-flex rounded-full size-1.5 bg-violet-500" />
          </span>
          AI-Powered CRO Analysis
        </div>

        {/* Headline */}
        <div className="flex flex-col gap-5">
          <h1 className="text-6xl sm:text-7xl font-bold tracking-[-0.04em] leading-[1.02] text-foreground">
            Turn visitors<br />
            into{" "}
            <span className="bg-gradient-to-r from-violet-500 via-violet-400 to-blue-400 bg-clip-text text-transparent">
              customers.
            </span>
          </h1>
          <p className="text-base sm:text-[17px] text-muted-foreground leading-relaxed max-w-[340px] mx-auto">
            Paste any URL and get a deep CRO audit across 6 conversion pillars in under 15 seconds.
          </p>
        </div>

        {/* Pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {PILLS.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-background/70 dark:bg-background/50 backdrop-blur-sm text-muted-foreground border border-border shadow-sm hover:text-foreground hover:border-border/80 transition-colors duration-150"
            >
              <Icon className="size-3.5 text-violet-500" strokeWidth={2.5} />
              {label}
            </span>
          ))}
        </div>

        {/* URL input card */}
        <div className="w-full">
          <div className="relative w-full rounded-2xl border border-border bg-background/90 backdrop-blur-md shadow-xl transition-all duration-200 has-[input:focus]:border-violet-500/50 has-[input:focus]:ring-4 has-[input:focus]:ring-violet-500/10">
            <form action="/results" method="GET" className="flex items-center p-2 gap-2">
              <div className="flex items-center flex-1 gap-3 pl-4 pr-2">
                {/* Link icon */}
                <svg
                  className="size-4 shrink-0 text-muted-foreground/40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <input
                  name="url"
                  type="url"
                  placeholder="https://yoursite.com"
                  required
                  autoFocus
                  className="flex-1 h-11 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
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
          <p className="mt-3 text-[11px] text-muted-foreground/50 tracking-wide uppercase">
            Free · No credit card · Results in ~15 seconds
          </p>
        </div>

      </div>
    </main>
  );
}
