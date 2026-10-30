import {createClient} from "@/lib/supabase/server";
import Link from "next/link";
import {ChequeRegister} from "@/components/cheque-register";
import {PAGE_SIZE,buildRegisterFilter,parseRegisterParams} from "@/lib/register-query";

export default async function Cheques({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const s=await createClient();
  const {data:claimsData}=await s.auth.getClaims();
  const userId=claimsData?.claims?.sub as string|undefined;
  if(!userId)return null;
  const params=parseRegisterParams(await searchParams);
  const filter=await buildRegisterFilter(s,userId,params);
  const from=(params.page-1)*PAGE_SIZE;
  const {data,error,count}=await filter(
    s.from("cheques").select("id,cheque_number,cheque_date,payee_id,amount,status,created_at,notes,print_count,payees(name)",{count:"exact"}).eq("user_id",userId)
  ).range(from,from+PAGE_SIZE-1);
  return <main className="main"><div className="toolbar"><div><div className="eyebrow">CHEQUE MANAGEMENT</div><h1>Cheque Register</h1><p className="muted">Search, filter and open every saved cheque from one place.</p></div><Link className="btn" href="/designer">+ New cheque</Link></div>{error?<div className="card empty"><h3>Unable to load register</h3><p className="muted">Something went wrong while loading your cheques. Please refresh and try again.</p></div>:<ChequeRegister rows={(data||[]) as any} total={count??0} params={params}/>}</main>;
}
