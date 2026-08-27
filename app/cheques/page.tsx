import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChequeRegister } from "@/components/cheque-register";

export default async function Cheques() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const { data, error } = await s.from("cheques").select("id,cheque_number,cheque_date,payee_id,amount,status,created_at,notes,print_count,payees(name)").eq("user_id", user.id).order("created_at", { ascending: false });
  return <main className="main"><div className="toolbar"><div><div className="eyebrow">CHEQUE MANAGEMENT</div><h1>Cheque Register</h1><p className="muted">Search, filter and open every saved cheque from one place.</p></div><Link className="btn" href="/designer">+ New cheque</Link></div>{error?<div className="card empty"><h3>Unable to load register</h3><p className="muted">{error.message}</p></div>:<ChequeRegister rows={(data||[]) as any} />}</main>;
}
