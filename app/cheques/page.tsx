import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Cheques() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const { data, error } = await s.from("cheques").select("id,cheque_number,cheque_date,payee_id,amount,status,created_at,notes,print_count,payees(name)").eq("user_id", user.id).order("created_at", { ascending: false });
  return <main className="main"><div className="toolbar"><div><h1>Cheque Register</h1><p className="muted">Every saved and printed cheque stays here.</p></div><Link className="btn" href="/designer">+ New cheque</Link></div><div className="card table-wrap">{error?<div className="empty"><h3>Unable to load register</h3><p className="muted">{error.message}</p></div>:<><table className="table"><thead><tr><th>Date</th><th>Cheque No.</th><th>Payee</th><th>Amount</th><th>Status</th><th>Prints</th><th></th></tr></thead><tbody>{(data||[]).map((c:any)=><tr key={c.id}><td>{c.cheque_date||"—"}</td><td>{c.cheque_number||"—"}</td><td>{c.payees?.name||"—"}</td><td>₹{Number(c.amount||0).toLocaleString("en-IN",{minimumFractionDigits:2})}</td><td><span className="badge">{c.status}</span></td><td>{c.print_count??0}</td><td><Link className="text-link" href={`/cheques/${c.id}`}>View</Link></td></tr>)}</tbody></table>{!data?.length&&<div className="empty"><h3>No cheques yet</h3><p className="muted">Create your first cheque from the designer.</p><Link className="btn" href="/designer">Create cheque</Link></div>}</>}</div></main>;
}
