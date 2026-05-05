import { supabaseAdmin } from "./supabase-service";
import type { AuditResultV2 } from "./auditor";

export type AuditRecord = {
  id: string;
  url: string;
  overall_grade: string;
  pillar_scores: AuditResultV2["pillars"];
  created_at: string;
};

export async function saveAudit(
  url: string,
  audit: AuditResultV2,
  userId?: string | null,
  screenshotBase64?: string | null,
  sessionId?: string | null
): Promise<string> {
  const payload: Record<string, unknown> = {
    url,
    overall_grade: audit.overallGrade,
    pillar_scores: audit.pillars,
    full_result: audit,
    user_id: userId ?? null,
    screenshot_base64: screenshotBase64 ?? null,
    visual_annotations: audit.visualAnnotations ?? null,
  };
  if (sessionId) payload.session_id = sessionId;

  console.log("[SiteIQ] saveAudit insert payload keys:", Object.keys(payload), "url:", url, "userId:", userId ?? "anon");
  const { data, error } = await supabaseAdmin.from("audits").insert(payload).select("id").single();
  console.log("[SiteIQ] saveAudit result — id:", data?.id ?? null, "error:", error ? `${error.code} ${error.message}` : null);
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function getAuditHistory(userId: string): Promise<AuditRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("audits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as AuditRecord[];
}
