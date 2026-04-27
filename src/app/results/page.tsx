import { redirect } from "next/navigation";
import ResultsClient from "./ResultsClient";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  if (!url) redirect("/");
  return <ResultsClient url={url} />;
}
