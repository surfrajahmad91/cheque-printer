import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {AdminUsers} from "@/components/admin-users";

const ADMIN_EMAIL = "surfrajahmad@gmail.com";

export default async function AdminUsersPage(){
  const s=await createClient();
  const {data:claimsData}=await s.auth.getClaims();
  const claims=claimsData?.claims;
  const userId=claims?.sub as string|undefined;
  const email=typeof claims?.email === "string" ? claims.email.trim().toLowerCase() : "";

  if(!userId)redirect("/login");
  if(email!==ADMIN_EMAIL)redirect("/dashboard");

  return <AdminUsers/>;
}
