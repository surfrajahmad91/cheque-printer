import { notFound,redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChequePrintView } from "@/components/cheque-print-view";
export default async function PrintCheque({params}:{params:Promise<{id:string}>}){const {id}=await params;const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)redirect("/login");const {data:cheque,error}=await s.from("cheques").select("id,status,layout_snapshot").eq("id",id).eq("user_id",user.id).single();if(error||!cheque)notFound();if(cheque.status==="cancelled"||cheque.status==="void")notFound();return <ChequePrintView snapshot={cheque.layout_snapshot}/>}
