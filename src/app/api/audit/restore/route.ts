import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import type { AuditResultV2 } from "@/lib/auditor";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const idsParam = request.nextUrl.searchParams.get("ids");

  if (!id && !idsParam) {
    return NextResponse.json({ error: "id or ids required" }, { status: 400 });
  }

  if (idsParam) {
    const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ error: "no ids" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("audits")
      .select("id, url, full_result, screenshot_base64")
      .in("id", ids);

    if (error || !data?.length) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    // Preserve the order of the requested IDs
    const byId = new Map(data.map((row) => [row.id, row]));
    const pages = ids
      .map((rid) => byId.get(rid))
      .filter((row): row is NonNullable<typeof row> => !!row?.full_result)
      .map((row) => ({
        url: row.url as string,
        audit: row.full_result as AuditResultV2,
        screenshot: (row.screenshot_base64 as string | null) ?? null,
      }));

    if (pages.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ pages });
  }

  // Single audit by ID
  const { data, error } = await supabaseAdmin
    .from("audits")
    .select("full_result, screenshot_base64")
    .eq("id", id!)
    .maybeSingle();

  if (error || !data?.full_result) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    audit: data.full_result as AuditResultV2,
    screenshot: (data.screenshot_base64 as string | null) ?? null,
  });
}
