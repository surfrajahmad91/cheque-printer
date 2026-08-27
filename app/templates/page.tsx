"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Template = { id: string; name: string; layout: any; updated_at: string };

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setBusy(true); setError("");
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) { setError("Please sign in to manage templates."); setBusy(false); return; }
    const { data, error: e } = await s.from("cheque_templates").select("id,name,layout,updated_at").eq("user_id", user.id).eq("is_active", true).order("updated_at", { ascending: false });
    if (e) setError(e.message); else setTemplates(data || []);
    setBusy(false);
  };

  useEffect(() => { void load(); }, []);

  const remove = async (id: string) => {
    if (!window.confirm("Delete this template?")) return;
    const s = createClient();
    const { error: e } = await s.from("cheque_templates").delete().eq("id", id);
    if (e) setError(e.message); else setTemplates((x) => x.filter((t) => t.id !== id));
  };

  return <main className="main">
    <div className="toolbar">
      <div><h1>Cheque Templates</h1><p className="muted">Reusable payee and calibration layouts for your cheque books.</p></div>
      <Link className="btn" href="/designer">New cheque</Link>
    </div>
    {error && <div className="designer-error">{error}</div>}
    {busy ? <div className="card"><p className="muted">Loading templates…</p></div> : templates.length ? <div className="grid cards">{templates.map((t) => <div className="card" key={t.id}>
      <h3>{t.name}</h3>
      <p className="muted">Payee: {t.layout?.payee || "—"}</p>
      <p className="muted">Updated {new Date(t.updated_at).toLocaleString()}</p>
      <div className="action-row" style={{ position: "static", background: "transparent" }}>
        <Link className="btn secondary" href={`/designer?template=${t.id}`}>Use / Edit</Link>
        <button className="btn" type="button" onClick={() => void remove(t.id)}>Delete</button>
      </div>
    </div>)}</div> : <div className="card"><p className="muted">No templates yet. Open the designer, calibrate your cheque, and save it as a template.</p></div>}
  </main>;
}
