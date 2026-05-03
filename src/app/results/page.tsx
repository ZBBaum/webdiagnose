import { redirect } from "next/navigation";
import ResultsClient from "./ResultsClient";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; urls?: string }>;
}) {
  const { url, urls } = await searchParams;
  if (!url && !urls) redirect("/");
  // For multi-page, derive a display URL from the first entry
  const effectiveUrl = url ?? urls!.split(",")[0] ?? "";
  return <ResultsClient url={effectiveUrl} urls={urls} />;
}
