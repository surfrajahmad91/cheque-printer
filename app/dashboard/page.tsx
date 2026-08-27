import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Dashboard() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const [{ count: saved }, { count: drafts }, { count: printedToday }] = await Promise.all([
    s.from("cheques").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    s.from("cheques").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "draft"),
    s.from("print_history").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("printed_at", start).lt("printed_at", end),
  ]);

  return <main className="main"><div className="toolbar"><div><h1>Dashboard</h1><p className="muted">Welcome back, {user.user_metadata?.name || user.email}.</p></div><Link className="btn" href="/designer">+ Create Cheque</Link></div><div className="grid cards"><div className="card"><h3>{saved ?? 0}</h3><span className="muted">Saved cheques</span></div><div className="card"><h3>{printedToday ?? 0}</h3><span className="muted">Printed today</span></div><div className="card"><h3>{drafts ?? 0}</h3><span className="muted">Drafts</span></div><div className="card"><h3>v24</h3><span className="muted">Calibration engine</span></div></div></main>;
}
