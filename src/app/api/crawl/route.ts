import { NextRequest, NextResponse } from "next/server";
import { discoverLinks } from "@/lib/scraper";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter is required" }, { status: 400 });
  }

  try {
    const pages = await discoverLinks(url); // returns DiscoveredPage[]
    return NextResponse.json({ pages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to discover pages";
    console.error("[crawl]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
