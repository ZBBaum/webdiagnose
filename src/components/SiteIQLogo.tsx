export default function SiteIQLogo({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="siq-g" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="28" fill="url(#siq-g)" />
      <text x="7" y="90" fontFamily="'DM Sans',system-ui,-apple-system,sans-serif" fontWeight="700" fontSize="88" fill="white">S</text>
      <rect x="82" y="55" width="12" height="35" rx="1.5" fill="white" />
      <circle cx="88" cy="28" r="13" stroke="white" strokeWidth="4" fill="none" />
      <line x1="97.5" y1="37" x2="108" y2="49" stroke="white" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
