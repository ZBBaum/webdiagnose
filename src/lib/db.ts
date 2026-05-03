import { supabase } from "./supabase";
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
): Promise<void> {
  const payload: Record<string, unknown> = {
    url,
    overall_grade: audit.overallGrade,
    pillar_scores: audit.pillars,
    user_id: userId ?? null,
    screenshot_base64: screenshotBase64 ?? null,
    visual_annotations: audit.visualAnnotations ?? null,
  };
  if (sessionId) payload.session_id = sessionId;

  const { error } = await supabase.from("audits").insert(payload);
  if (error) throw new Error(error.message);
}

export async function getAuditHistory(userId: string): Promise<AuditRecord[]> {
  const { data, error } = await supabase
    .from("audits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as AuditRecord[];
}
