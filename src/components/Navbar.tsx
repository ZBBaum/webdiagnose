import UserMenu from "./UserMenu";
import SiteIQLogo from "./SiteIQLogo";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 h-[76px] border-b border-white/8 backdrop-blur-md flex items-center print:hidden bg-[#090909]/90">
      <div className="max-w-6xl mx-auto px-8 w-full flex items-center justify-between">
        <a href="/" className="inline-flex items-center gap-3">
          <SiteIQLogo size={36} className="shrink-0" />
          <span className="text-base font-semibold tracking-tight text-white">SiteIQ</span>
        </a>
        <div className="flex items-center gap-6">
          <a
            href="/pricing"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Pricing
          </a>
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
