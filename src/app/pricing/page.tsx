import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    variant: "free" as const,
    name: "Free",
    price: null,
    description: "Try it out, no strings attached.",
    features: ["1 audit per day", "Single page per audit", "No history saved"],
    cta: "Get started free",
    href: "/",
  },
  {
    variant: "pro" as const,
    name: "Pro",
    price: "19.99",
    description: "For founders and marketers serious about conversion.",
    features: [
      "10 audits per day",
      "Full site audit",
      "Score history",
      "PDF export",
    ],
    cta: "Start Pro — $19.99/mo",
    href: "/api/checkout?plan=pro",
  },
  {
    variant: "agency" as const,
    name: "Agency",
    price: "49.99",
    description: "Built for teams running audits at scale.",
    features: [
      "Unlimited audits",
      "White-label PDF reports",
      "Team seats",
      "Priority support",
    ],
    cta: "Start Agency — $49.99/mo",
    href: "/api/checkout?plan=agency",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-[calc(100vh-76px)] flex flex-col items-center px-6 py-16 gap-12">
      {/* header */}
      <div className="flex flex-col items-center gap-4 text-center max-w-xl">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 tracking-wide">
          <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
          Simple pricing
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Upgrade your{" "}
          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            audit power
          </span>
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Start free, upgrade when you need more. Cancel any time.
        </p>
      </div>

      {/* plan grid */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {PLANS.map((plan) => {
          const isAgency = plan.variant === "agency";
          const isPro = plan.variant === "pro";

          const cardInner = (
            <div
              className={cn(
                "relative flex flex-col h-full rounded-2xl p-7 gap-6",
                isAgency
                  ? "bg-[#0d0d12] text-white"
                  : "bg-card text-foreground border border-border",
                isPro && "border-blue-400 shadow-lg shadow-blue-100 dark:shadow-blue-950/30"
              )}
            >
              {/* badge */}
              {isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm whitespace-nowrap">
                    Most popular
                  </span>
                </div>
              )}
              {isAgency && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-amber-400 to-orange-400 text-black shadow-sm whitespace-nowrap">
                    ✦ Best value
                  </span>
                </div>
              )}

              {/* name + price */}
              <div className="space-y-1">
                <p className={cn(
                  "text-xs font-bold uppercase tracking-widest",
                  isAgency ? "text-white/50" : "text-muted-foreground"
                )}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1">
                  {plan.price !== null ? (
                    <>
                      <span className={cn(
                        "text-4xl font-extrabold",
                        isAgency ? "text-white" : "text-foreground"
                      )}>
                        ${plan.price}
                      </span>
                      <span className={cn(
                        "text-sm",
                        isAgency ? "text-white/50" : "text-muted-foreground"
                      )}>/mo</span>
                    </>
                  ) : (
                    <span className="text-4xl font-extrabold text-foreground">Free</span>
                  )}
                </div>
                <p className={cn(
                  "text-xs leading-relaxed pt-0.5",
                  isAgency ? "text-white/60" : "text-muted-foreground"
                )}>
                  {plan.description}
                </p>
              </div>

              {/* features */}
              <ul className="flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check
                      size={15}
                      className={cn(
                        "mt-0.5 shrink-0",
                        isAgency ? "text-amber-400" : isPro ? "text-blue-400" : "text-emerald-500"
                      )}
                    />
                    <span className={isAgency ? "text-white/80" : "text-foreground"}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {/* cta */}
              <a
                href={plan.href}
                className={cn(
                  "inline-flex items-center justify-center h-11 rounded-xl text-sm font-semibold transition-all",
                  isAgency
                    ? "bg-gradient-to-r from-amber-400 to-orange-400 text-black hover:from-amber-300 hover:to-orange-300 shadow-md shadow-amber-900/30"
                    : isPro
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600 shadow-sm"
                    : "border border-border bg-background hover:bg-muted text-foreground"
                )}
              >
                {plan.cta}
              </a>
            </div>
          );

          if (isAgency) {
            return (
              <div
                key={plan.name}
                className="relative rounded-2xl p-[1.5px] shadow-[0_0_50px_-8px_rgba(139,92,246,0.5)]"
                style={{
                  background: "linear-gradient(135deg, #2563eb, #06b6d4, #06b6d4)",
                }}
              >
                {cardInner}
              </div>
            );
          }

          return <div key={plan.name}>{cardInner}</div>;
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Payments powered by Stripe · Secure · Cancel any time
      </p>
    </main>
  );
}
