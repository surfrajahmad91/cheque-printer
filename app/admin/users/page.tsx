import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {AdminUsers} from "@/components/admin-users";

export default async function AdminUsersPage(){
  const s=await createClient();
  const {data:claimsData}=await s.auth.getClaims();
  if(!claimsData?.claims?.sub)redirect("/login");
  return <AdminUsers/>;
}
