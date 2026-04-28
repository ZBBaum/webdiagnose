import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import SiteIQLogo from "./SiteIQLogo";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 h-[60px] border-b border-border bg-background/95 backdrop-blur-sm flex items-center print:hidden">
      <div className="max-w-6xl mx-auto px-6 w-full flex items-center justify-between">
        <a href="/" className="inline-flex items-center gap-2.5">
          <SiteIQLogo size={28} className="shrink-0" />
          <span className="text-sm font-semibold tracking-tight">SiteIQ</span>
        </a>
        <div className="flex items-center gap-4">
          <a
            href="/pricing"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
