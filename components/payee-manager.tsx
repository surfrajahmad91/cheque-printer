"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Payee = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
};

const norm = (v: string) => v.trim().replace(/\s+/g, " ").toLowerCase();

type Props = {
  initialRows: Payee[];
  initialError?: string;
};

export function PayeeManager({ initialRows, initialError = "" }: Props) {
  const [rows, setRows] = useState<Payee[]>(initialRows);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(initialError);

  const reset = () => {
    setEditing(null);
    setName("");
    setPhone("");
    setAddress("");
    setNotes("");
  };

  const save = async () => {
    if (!name.trim()) {
      setMsg("Payee name is required.");
      return;
    }

    const clash = rows.find((r) => r.id !== editing && norm(r.name) === norm(name));
    if (clash) {
      setMsg(`“${clash.name}” already exists. Use it instead of adding the same name again.`);
      return;
    }

    setBusy(true);
    setMsg("");
    const s = createClient();
    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { data, error } = await s
        .from("payees")
        .update(payload)
        .eq("id", editing)
        .select("id,name,phone,address,notes,is_active")
        .single();

      if (error) {
        setMsg(error.message);
      } else {
        setRows((current) => current.map((row) => (row.id === editing ? data : row)));
        setMsg("Payee updated ✓");
        reset();
      }
    } else {
      const { data, error } = await s
        .from("payees")
        .insert(payload)
        .select("id,name,phone,address,notes,is_active")
        .single();

      if (error) {
        setMsg(error.message);
      } else {
        setRows((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
        setMsg("Payee added ✓");
        reset();
      }
    }

    setBusy(false);
  };

  const edit = (p: Payee) => {
    setEditing(p.id);
    setName(p.name);
    setPhone(p.phone || "");
    setAddress(p.address || "");
    setNotes(p.notes || "");
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggle = async (p: Payee) => {
    setMsg("");
    const s = createClient();
    const next = !p.is_active;
    const { error } = await s
      .from("payees")
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq("id", p.id);

    if (error) setMsg(error.message);
    else setRows((current) => current.map((row) => (row.id === p.id ? { ...row, is_active: next } : row)));
  };

  const groups = useMemo(() => {
    const map = new Map<string, Payee[]>();
    rows.forEach((r) => map.set(norm(r.name), [...(map.get(norm(r.name)) || []), r]));
    return map;
  }, [rows]);

  // Moves every cheque from the duplicate to the payee you keep, then removes the duplicate.
  const merge = async (dup: Payee, keep: Payee) => {
    if (!window.confirm(`Merge “${dup.name}” into “${keep.name}”?\n\nAll cheques will show “${keep.name}” and “${dup.name}” will be removed. This cannot be undone.`)) return;
    setBusy(true);
    setMsg("");
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) { setBusy(false); setMsg("Please sign in again."); return; }
    const moved = await s.from("cheques").update({ payee_id: keep.id }).eq("payee_id", dup.id).eq("user_id", user.id);
    if (moved.error) { setBusy(false); setMsg(moved.error.message); return; }
    const removed = await s.from("payees").delete().eq("id", dup.id).eq("user_id", user.id);
    if (removed.error) {
      await s.from("payees").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", dup.id);
      setRows((current) => current.map((row) => (row.id === dup.id ? { ...row, is_active: false } : row)));
      setMsg("Cheques moved. The duplicate could not be deleted, so it was deactivated instead.");
    } else {
      setRows((current) => current.filter((row) => row.id !== dup.id));
      setMsg(`Merged into “${keep.name}” ✓`);
    }
    setBusy(false);
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (p) => p.name.toLowerCase().includes(query) || (p.phone || "").includes(query),
    );
  }, [rows, q]);

  return (
    <main className="main">
      <div className="toolbar">
        <div>
          <div className="eyebrow">DIRECTORY</div>
          <h1>Payees</h1>
          <p className="muted">Keep reusable payee details ready for cheque creation.</p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>{editing ? "Edit payee" : "Add payee"}</h2>
              <p className="muted">Store details once and reuse them when creating cheques.</p>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ABC Traders" autoComplete="organization" />
            </label>
            <label>
              Phone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" />
            </label>
            <label className="span-2">
              Address
              <input value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
            </label>
            <label className="span-2">
              Notes
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional internal note" />
            </label>
          </div>

          <div className="action-row">
            <button className="btn" disabled={busy} onClick={() => void save()}>
              {busy ? "Saving…" : editing ? "Update payee" : "Add payee"}
            </button>
            {editing && <button className="btn ghost" disabled={busy} onClick={reset}>Cancel</button>}
          </div>
          {msg && <p className="form-message">{msg}</p>}
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Saved payees</h2>
              <p className="muted">Search and manage your reusable directory.</p>
            </div>
            <span className="history-count">{filtered.length}</span>
          </div>

          <input className="standalone-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone" />

          <div className="record-list">
            {filtered.map((p) => {
              const twins = (groups.get(norm(p.name)) || []).filter((r) => r.id !== p.id);
              return (
              <div className="record-row" key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <span className="muted">{p.phone || "No phone"} · {p.is_active ? "Active" : "Inactive"}</span>
                  {twins.length > 0 && <span className="dup-flag">Possible duplicate</span>}
                </div>
                <div className="action-row">
                  {twins.length > 0 && <button className="btn secondary" disabled={busy} onClick={() => void merge(p, twins[0])}>Merge into “{twins[0].name}”</button>}
                  <button className="btn ghost" onClick={() => edit(p)}>Edit</button>
                  <button className="btn ghost" onClick={() => void toggle(p)}>{p.is_active ? "Deactivate" : "Activate"}</button>
                </div>
              </div>
              );
            })}
            {!filtered.length && <div className="empty"><h3>No payees found</h3><p className="muted">Add your first reusable payee above.</p></div>}
          </div>
        </section>
      </div>
    </main>
  );
}
