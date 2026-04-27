import { PLANS, type PlanId } from "@/lib/stripe";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const planName = plan && plan in PLANS ? PLANS[plan as PlanId].name : "Pro";

  return (
    <main className="min-h-[calc(100vh-60px)] flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 text-2xl">
          ✓
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            You&apos;re now on {planName}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your subscription is active. Start auditing any website with your
            upgraded limits.
          </p>
        </div>
        <a
          href="/"
          className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold hover:from-violet-700 hover:to-blue-700 transition-all"
        >
          Start auditing →
        </a>
      </div>
    </main>
  );
}
