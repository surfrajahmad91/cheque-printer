import {createClient} from "@/lib/supabase/server";
import Link from "next/link";

export default async function Dashboard(){
  const s=await createClient();
  const {data:claimsData}=await s.auth.getClaims();
  const userId=claimsData?.claims?.sub as string|undefined;
  const email=claimsData?.claims?.email as string|undefined;
  if(!userId)return null;
  const today=new Date();const start=new Date(today.getFullYear(),today.getMonth(),today.getDate()).toISOString();const end=new Date(today.getFullYear(),today.getMonth(),today.getDate()+1).toISOString();
  const [{count:saved},{count:drafts},{count:printedToday},{count:reprints},{count:locked},{data:recent}]=await Promise.all([
    s.from("cheques").select("id",{count:"exact",head:true}).eq("user_id",userId),
    s.from("cheques").select("id",{count:"exact",head:true}).eq("user_id",userId).eq("status","draft"),
    s.from("print_history").select("id",{count:"exact",head:true}).eq("user_id",userId).gte("printed_at",start).lt("printed_at",end),
    s.from("cheques").select("id",{count:"exact",head:true}).eq("user_id",userId).eq("status","reprinted"),
    s.from("cheques").select("id",{count:"exact",head:true}).eq("user_id",userId).in("status",["cancelled","void"]),
    s.from("cheques").select("id,cheque_number,cheque_date,amount,status,created_at,payees(name)").eq("user_id",userId).order("created_at",{ascending:false}).limit(6)
  ]);
  return <main className="main dashboard-page"><div className="toolbar dashboard-toolbar"><div><span className="eyebrow">CHEQUE WORKSPACE</span><h1>Good to see you.</h1><p className="muted">{email?`Signed in as ${email}`:"Your printing workspace is ready."}</p></div><Link className="btn btn-lg" href="/designer">+ Create cheque</Link></div>
    <div className="dashboard-intro"><div><span className="live-dot"/> Workspace ready</div><span>Calibration engine <strong>v24</strong> · Printer-ready</span></div>
    <div className="grid cards metric-cards"><div className="card"><span className="metric-label">Saved cheques</span><h3>{saved??0}</h3><span className="metric-note">Complete register</span></div><div className="card"><span className="metric-label">Printed today</span><h3>{printedToday??0}</h3><span className="metric-note">Successful print records</span></div><div className="card"><span className="metric-label">Drafts</span><h3>{drafts??0}</h3><span className="metric-note">Ready to continue</span></div><div className="card"><span className="metric-label">Reprints</span><h3>{reprints??0}</h3><span className="metric-note">Printed again</span></div></div>
    <div className="dashboard-shortcuts"><Link className="shortcut featured" href="/designer"><span className="shortcut-icon">＋</span><strong>New cheque</strong><span>Start a fresh print-ready cheque →</span></Link><Link className="shortcut" href="/cheques"><span className="shortcut-icon">▤</span><strong>Cheque register</strong><span>Search and manage saved records →</span></Link><Link className="shortcut" href="/templates"><span className="shortcut-icon">◇</span><strong>Templates</strong><span>Reuse calibrated layouts →</span></Link><Link className="shortcut" href="/payees"><span className="shortcut-icon">◎</span><strong>Payees</strong><span>Manage reusable details →</span></Link><Link className="shortcut" href="/settings"><span className="shortcut-icon">⚙</span><strong>Settings</strong><span>Printers, series and backups →</span></Link></div>
    <section className="card activity-card"><div className="section-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Recent cheques</h2><p className="muted">Your latest saved and printed work.</p></div><Link className="text-link" href="/cheques">View register →</Link></div>{recent?.length?<div className="table-wrap"><table className="table"><thead><tr><th>Payee</th><th>Date</th><th>Cheque no.</th><th>Amount</th><th>Status</th></tr></thead><tbody>{recent.map((c:any)=><tr key={c.id}><td><strong>{c.payees?.name||"—"}</strong></td><td>{c.cheque_date||"—"}</td><td>{c.cheque_number||"—"}</td><td>₹{Number(c.amount||0).toLocaleString("en-IN",{minimumFractionDigits:2})}</td><td><span className={`status-pill status-${c.status}`}>{c.status}</span></td></tr>)}</tbody></table></div>:<div className="empty"><h3>No cheques yet</h3><p className="muted">Create your first cheque from the designer.</p><Link className="btn secondary" href="/designer">Create cheque</Link></div>}</section>
    <div className="dashboard-footnote"><span>{locked??0} cancelled/void records</span><span>Secure account workspace</span></div>
  </main>;
}
