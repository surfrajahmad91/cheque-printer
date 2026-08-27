import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PayeeManager } from "@/components/payee-manager";
export default async function Payees(){const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)redirect("/login");return <PayeeManager/>}
