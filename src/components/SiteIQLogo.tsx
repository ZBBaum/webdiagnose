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
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="siq-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#siq-g)" />
      {/* Bold S */}
      <text
        x="2.5"
        y="24"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
        fontWeight="800"
        fontSize="21"
        fill="white"
      >
        S
      </text>
      {/* i stem (dot replaced by magnifying glass) */}
      <rect x="20.5" y="14.5" width="3.5" height="9.5" rx="1.75" fill="white" />
      {/* magnifying glass lens as i dot */}
      <circle cx="22.25" cy="8" r="2.75" stroke="white" strokeWidth="1.8" fill="none" />
      {/* handle */}
      <line x1="24.1" y1="9.85" x2="27" y2="12.75" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
