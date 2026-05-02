import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const ANON_LIMIT = 1;
const FREE_LIMIT = 3;
export const RATE_LIMIT_ERROR =
  "You've used your free audits for today. Upgrade to Pro for unlimited audits.";

const ADMIN_EMAILS = new Set([
  "zackbaum2008@gmail.com",
  "jeff.baum@fairfieldmgmt.com",
  "dr.gulsungul@gmail.com",
  "sadiemarigold2009@gmail.com",
]);

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function identifier(request: NextRequest, userId: string | null): string {
  if (userId) return `user:${userId}`;
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `ip:${ip}`;
}

function nextMidnightUTC(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

export async function checkRateLimit(
  request: NextRequest,
  userId: string | null,
  userEmail?: string | null
): Promise<{ allowed: boolean; error?: string }> {
  if (userEmail && ADMIN_EMAILS.has(userEmail.toLowerCase())) {
    return { allowed: true };
  }

  const limit = userId ? FREE_LIMIT : ANON_LIMIT;
  const id = identifier(request, userId);
  const supabase = adminClient();

  const { data, error } = await supabase
    .from("rate_limits")
    .select("count, reset_at")
    .eq("identifier", id)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = row not found — that's expected for first-time users
    console.error("[rate-limit] select:", error.message);
    return { allowed: true }; // fail open so we never block legitimate users on DB errors
  }

  const now = new Date();

  if (!data || new Date(data.reset_at) <= now) {
    // First audit today or window has expired — reset to 1
    const { error: upsertErr } = await supabase
      .from("rate_limits")
      .upsert({ identifier: id, count: 1, reset_at: nextMidnightUTC() });
    if (upsertErr) console.error("[rate-limit] upsert:", upsertErr.message);
    return { allowed: true };
  }

  if (data.count >= limit) {
    return { allowed: false, error: RATE_LIMIT_ERROR };
  }

  const { error: updateErr } = await supabase
    .from("rate_limits")
    .update({ count: data.count + 1 })
    .eq("identifier", id);
  if (updateErr) console.error("[rate-limit] update:", updateErr.message);

  return { allowed: true };
}
