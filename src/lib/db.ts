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
  userId?: string | null
): Promise<void> {
  const { error } = await supabase.from("audits").insert({
    url,
    overall_grade: audit.overallGrade,
    pillar_scores: audit.pillars,
    user_id: userId ?? null,
  });
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
