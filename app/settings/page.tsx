import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsManager } from "@/components/settings-manager";
export default async function Settings(){const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)redirect("/login");return <SettingsManager/>}
