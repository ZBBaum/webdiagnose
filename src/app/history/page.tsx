import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getAuditHistory } from "@/lib/db";

const GRADE_COLOR: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  B: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  C: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  D: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  F: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

export default async function HistoryPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  console.log("[history] getUser result:", user ? `id=${user.id} email=${user.email}` : "null");

  if (!user) redirect("/login");

  const audits = await getAuditHistory(user.id);

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Audit history</h1>
        <p className="mt-1 text-sm text-muted-foreground">All audits run on your account</p>
      </div>

      {audits.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">No audits yet.</p>
          <a
            href="/"
            className="mt-4 inline-flex h-9 items-center px-4 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Run your first audit
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {audits.map((audit) => {
            const gradeColor = GRADE_COLOR[audit.overall_grade] ?? GRADE_COLOR["F"];
            const date = new Date(audit.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            return (
              <div
                key={audit.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:bg-muted/50 transition-colors"
              >
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${gradeColor}`}>
                  {audit.overall_grade}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{audit.url}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
                </div>
                <a
                  href={`/results?url=${encodeURIComponent(audit.url)}`}
                  className="shrink-0 h-8 px-3 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors inline-flex items-center"
                >
                  Re-run
                </a>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
