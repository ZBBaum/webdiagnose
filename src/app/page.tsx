import { Input } from "@/components/ui/input";

const PILLS = [
  { icon: "⚡", label: "15 second analysis" },
  { icon: "◆", label: "6 conversion pillars" },
  { icon: "✦", label: "No signup required" },
];

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-76px)] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg flex flex-col items-center text-center gap-7">

        {/* eyebrow badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 tracking-wide">
          <span className="size-1.5 rounded-full bg-violet-500 shrink-0" />
          AI-Powered CRO Analysis
        </span>

        {/* headline */}
        <h1 className="text-5xl font-bold tracking-tight leading-[1.12] text-foreground">
          More visitors. More{" "}
          <span className="bg-gradient-to-r from-violet-600 to-blue-500 bg-clip-text text-transparent">
            conversions.
          </span>
          <br className="hidden sm:block" />
          {" "}Better results.
        </h1>

        {/* subtitle */}
        <p className="text-base text-muted-foreground leading-relaxed max-w-sm">
          Paste any URL and get an instant audit across 6 conversion pillars.
        </p>

        {/* feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {PILLS.map(({ icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border"
            >
              <span className="text-[10px] opacity-60">{icon}</span>
              {label}
            </span>
          ))}
        </div>

        {/* form card */}
        <div className="w-full bg-card rounded-2xl border border-border shadow-md p-4">
          <form action="/results" method="GET" className="flex gap-2">
            <Input
              name="url"
              type="url"
              placeholder="https://yoursite.com"
              required
              autoFocus
              className="flex-1 h-11 text-sm px-4 rounded-xl bg-background"
            />
            <button
              type="submit"
              className="h-11 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold hover:from-violet-700 hover:to-blue-700 transition-all shrink-0 cursor-pointer whitespace-nowrap"
            >
              Analyze →
            </button>
          </form>
          <p className="mt-3 text-[11px] text-muted-foreground">
            No account needed · Results in ~15 seconds
          </p>
        </div>

      </div>
    </main>
  );
}
