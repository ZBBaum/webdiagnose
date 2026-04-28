import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 h-[60px] border-b border-border bg-background/95 backdrop-blur-sm flex items-center print:hidden">
      <div className="max-w-6xl mx-auto px-6 w-full flex items-center justify-between">
        <a href="/" className="inline-flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path
                d="M2 4L6 13L9 7L12 13L16 4"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
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
