import {createClient} from "@/lib/supabase/server";
import {buildRegisterFilter,parseRegisterParams} from "@/lib/register-query";

export const dynamic="force-dynamic";

// Spreadsheet apps run cells that start with these characters as formulas.
const cell=(v:unknown)=>{
  let t=v==null?"":String(v);
  if(/^[=+\-@\t\r]/.test(t))t="'"+t;
  return /[",\n\r]/.test(t)?`"${t.replace(/"/g,'""')}"`:t;
};

export async function GET(request:Request){
  const s=await createClient();
  const {data:claimsData}=await s.auth.getClaims();
  const userId=claimsData?.claims?.sub as string|undefined;
  if(!userId)return new Response("Please sign in to export.",{status:401});

  const params=parseRegisterParams(Object.fromEntries(new URL(request.url).searchParams));
  const filter=await buildRegisterFilter(s,userId,params);
  const rows:any[]=[];
  for(let from=0;from<10000;from+=1000){
    const {data,error}=await filter(
      s.from("cheques").select("cheque_number,cheque_date,amount,amount_in_words,status,print_count,notes,created_at,payees(name)").eq("user_id",userId)
    ).range(from,from+999);
    if(error)return new Response("Export failed. Please try again.",{status:500});
    rows.push(...(data||[]));
    if(!data||data.length<1000)break;
  }
  const head=["Cheque no.","Date","Payee","Amount (INR)","Amount in words","Status","Prints","Notes","Saved at"];
  const lines=[head.join(","),...rows.map(r=>[r.cheque_number,r.cheque_date,r.payees?.name,Number(r.amount||0).toFixed(2),r.amount_in_words,r.status,r.print_count??0,r.notes,r.created_at].map(cell).join(","))];
  const day=new Date().toISOString().slice(0,10);
  return new Response("\uFEFF"+lines.join("\r\n"),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="cheque-register-${day}.csv"`,"Cache-Control":"no-store"}});
}
