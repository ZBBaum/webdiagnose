import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import SiteIQLogo from "./SiteIQLogo";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 h-[76px] border-b border-border backdrop-blur-sm flex items-center print:hidden bg-gradient-to-r from-white/95 via-white/95 to-violet-50/80 dark:from-slate-950/95 dark:via-slate-950/95 dark:to-violet-950/50">
      <div className="max-w-6xl mx-auto px-8 w-full flex items-center justify-between">
        <a href="/" className="inline-flex items-center gap-3">
          <SiteIQLogo size={36} className="shrink-0" />
          <span className="text-base font-semibold tracking-tight">SiteIQ</span>
        </a>
        <div className="flex items-center gap-5">
          <a
            href="/pricing"
            className="text-[15px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </a>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
