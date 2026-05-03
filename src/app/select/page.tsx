import { redirect } from "next/navigation";
import SelectClient from "./SelectClient";

export default async function SelectPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  if (!url) redirect("/");
  return <SelectClient url={url} />;
}
