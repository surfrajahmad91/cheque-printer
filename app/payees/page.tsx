import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PayeeManager } from "@/components/payee-manager";

export default async function Payees() {
  const s = await createClient();
  const { data: claimsData } = await s.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data, error } = await s
    .from("payees")
    .select("id,name,phone,address,notes,is_active")
    .eq("user_id", userId)
    .order("name");

  return <PayeeManager initialRows={data ?? []} initialError={error?.message ?? ""} />;
}
