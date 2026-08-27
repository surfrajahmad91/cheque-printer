import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsManager } from "@/components/settings-manager";

export default async function Settings() {
  const s = await createClient();
  const { data: claimsData } = await s.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const [seriesResult, printersResult] = await Promise.all([
    s.from("cheque_series").select("*").eq("user_id", userId).order("name"),
    s.from("printer_profiles").select("*").eq("user_id", userId).order("name"),
  ]);

  return (
    <SettingsManager
      initialSeries={seriesResult.data ?? []}
      initialPrinters={printersResult.data ?? []}
      initialError={seriesResult.error?.message || printersResult.error?.message || ""}
    />
  );
}
