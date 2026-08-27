import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Dashboard() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const [{ count: saved }, { count: drafts }, { count: printedToday }, { data: recent }] = await Promise.all([
    s.from("cheques").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    s.from("cheques").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "draft"),
    s.from("print_history").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("printed_at", start).lt("printed_at", end),
    s.from("cheques").select("id,cheque_number,cheque_date,amount,status,created_at,payees(name)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
  ]);

  return <main className="main dashboard-page">
    <div className="toolbar">
      <div><span className="eyebrow">Cheque printing</span><h1>Dashboard</h1><p className="muted">Welcome back, {user.user_metadata?.name || user.email}.</p></div>
      <Link className="btn" href="/designer">+ Create Cheque</Link>
    </div>
    <div className="grid cards">
      <div className="card"><span className="stat-label">Saved cheques</span><h3>{saved ?? 0}</h3><span className="muted">Your complete register</span></div>
      <div className="card"><span className="stat-label">Printed today</span><h3>{printedToday ?? 0}</h3><span className="muted">Successful print records</span></div>
      <div className="card"><span className="stat-label">Drafts</span><h3>{drafts ?? 0}</h3><span className="muted">Ready to continue</span></div>
      <div className="card"><span className="stat-label">Calibration engine</span><h3>v24</h3><span className="muted">Locked & ready</span></div>
    </div>
    <section className="card recent-card">
      <div className="section-heading"><div><span className="eyebrow">Activity</span><h2>Recent cheques</h2><p className="muted">Your latest saved and printed work.</p></div><Link className="text-link" href="/cheques">View register →</Link></div>
      {recent?.length ? <div className="recent-list">{recent.map((c:any)=><div className="recent-row" key={c.id}><div className="recent-main"><div className="recent-icon">₹</div><div><strong>{c.payees?.name || "Unnamed payee"}</strong><span>{c.cheque_date || "No date"} · Cheque {c.cheque_number || "—"}</span></div></div><div className="recent-meta"><strong>₹{Number(c.amount || 0).toLocaleString("en-IN", {minimumFractionDigits:2})}</strong><span className="badge">{c.status}</span></div></div>)}</div> : <div className="empty compact-empty"><h3>No cheques yet</h3><p className="muted">Create your first cheque from the designer.</p><Link className="btn secondary" href="/designer">Create cheque</Link></div>}
    </section>
  </main>;
}
