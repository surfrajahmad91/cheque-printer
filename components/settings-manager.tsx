"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Series = {
  id: string;
  name: string;
  bank_name: string | null;
  account_name: string | null;
  starting_number: number;
  next_number: number;
  is_active: boolean;
};

type Printer = {
  id: string;
  name: string;
  printer_name: string | null;
  paper_width_mm: number;
  paper_height_mm: number;
  scale_percent: number;
  offset_x_mm: number;
  offset_y_mm: number;
  rotation_degrees: number;
  is_default: boolean;
  is_active: boolean;
};

type Props = {
  initialSeries: Series[];
  initialPrinters: Printer[];
  initialError?: string;
};

export function SettingsManager({ initialSeries, initialPrinters, initialError = "" }: Props) {
  const [series, setSeries] = useState<Series[]>(initialSeries);
  const [printers, setPrinters] = useState<Printer[]>(initialPrinters);
  const [tab, setTab] = useState("series");
  const [msg, setMsg] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const s = createClient();
    const [a, b] = await Promise.all([
      s.from("cheque_series").select("*").order("name"),
      s.from("printer_profiles").select("*").order("name"),
    ]);
    if (a.error || b.error) setMsg((a.error || b.error)!.message);
    else {
      setSeries(a.data || []);
      setPrinters(b.data || []);
    }
  };

  const addSeries = async () => {
    const name = window.prompt("Series name");
    if (!name?.trim()) return;
    const start = Number(window.prompt("Starting cheque number", "1"));
    if (!Number.isInteger(start) || start < 1) {
      setMsg("Enter a positive whole starting number.");
      return;
    }

    setBusy(true);
    setMsg("");
    const s = createClient();
    const { data, error } = await s
      .from("cheque_series")
      .insert({ name: name.trim(), starting_number: start, next_number: start, is_active: true })
      .select("*")
      .single();
    setBusy(false);

    if (error) setMsg(error.message);
    else {
      setSeries((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
      setMsg("Cheque series added ✓");
    }
  };

  const toggleSeries = async (x: Series) => {
    setMsg("");
    const s = createClient();
    const next = !x.is_active;
    const { error } = await s
      .from("cheque_series")
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq("id", x.id);
    if (error) setMsg(error.message);
    else setSeries((current) => current.map((row) => (row.id === x.id ? { ...row, is_active: next } : row)));
  };

  const addPrinter = async () => {
    const name = window.prompt("Printer profile name");
    if (!name?.trim()) return;

    setBusy(true);
    setMsg("");
    const s = createClient();
    const { data, error } = await s
      .from("printer_profiles")
      .insert({
        name: name.trim(),
        paper_width_mm: 200,
        paper_height_mm: 100,
        scale_percent: 100,
        offset_x_mm: 0,
        offset_y_mm: 0,
        rotation_degrees: 0,
        is_default: printers.length === 0,
        is_active: true,
      })
      .select("*")
      .single();
    setBusy(false);

    if (error) setMsg(error.message);
    else {
      setPrinters((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
      setMsg("Printer profile added ✓");
    }
  };

  const togglePrinter = async (x: Printer) => {
    setMsg("");
    const s = createClient();
    const next = !x.is_active;
    const { error } = await s
      .from("printer_profiles")
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq("id", x.id);
    if (error) setMsg(error.message);
    else setPrinters((current) => current.map((row) => (row.id === x.id ? { ...row, is_active: next } : row)));
  };

  const exportBackup = async () => {
    setBusy(true);
    setMsg("");
    const s = createClient();
    const tables = ["profiles", "payees", "cheque_series", "cheque_templates", "cheque_field_calibrations", "printer_profiles", "cheques", "print_history", "audit_logs"] as const;
    const out: any = { format: "cheque-printing-backup", version: 1, exportedAt: new Date().toISOString(), tables: {} };

    for (const t of tables) {
      const { data, error } = await s.from(t).select("*");
      if (error) {
        setMsg(`Backup failed on ${t}: ${error.message}`);
        setBusy(false);
        return;
      }
      out.tables[t] = data || [];
    }

    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cheque-printing-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setBusy(false);
    setMsg("Backup exported ✓");
  };

  const restore = async (file: File) => {
    setBusy(true);
    setMsg("");
    try {
      const data = JSON.parse(await file.text());
      if (data.format !== "cheque-printing-backup") throw new Error("Invalid backup file.");

      const s = createClient();
      const { data: { user } } = await s.auth.getUser();
      if (!user) throw new Error("Please sign in again.");

      const t = data.tables || {};
      const payeeMap = new Map<string, string>();
      for (const p of t.payees || []) {
        const { data: existing } = await s.from("payees").select("id").eq("name", p.name).maybeSingle();
        let id = existing?.id;
        if (!id) {
          const r = await s.from("payees").insert({ name: p.name, phone: p.phone, address: p.address, notes: p.notes, is_active: p.is_active !== false, user_id: user.id }).select("id").single();
          if (r.error) throw r.error;
          id = r.data.id;
        }
        payeeMap.set(p.id, id);
      }
      for (const x of t.cheque_series || []) {
        const { error } = await s.from("cheque_series").upsert({ ...x, user_id: user.id }, { onConflict: "id" });
        if (error) throw error;
      }
      for (const x of t.cheque_templates || []) {
        const { error } = await s.from("cheque_templates").upsert({ ...x, user_id: user.id }, { onConflict: "id" });
        if (error) throw error;
      }
      for (const x of t.cheque_field_calibrations || []) {
        const { error } = await s.from("cheque_field_calibrations").upsert({ ...x, user_id: user.id }, { onConflict: "id" });
        if (error) throw error;
      }
      for (const x of t.printer_profiles || []) {
        const { error } = await s.from("printer_profiles").upsert({ ...x, user_id: user.id }, { onConflict: "id" });
        if (error) throw error;
      }
      for (const x of t.cheques || []) {
        const { error } = await s.from("cheques").upsert({ ...x, user_id: user.id, payee_id: payeeMap.get(x.payee_id) || x.payee_id }, { onConflict: "id" });
        if (error) throw error;
      }
      for (const x of t.print_history || []) {
        const { error } = await s.from("print_history").upsert({ ...x, user_id: user.id }, { onConflict: "id" });
        if (error) throw error;
      }

      await load();
      setMsg("Backup restored ✓");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Unable to restore backup");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="main">
      <div className="toolbar">
        <div>
          <div className="eyebrow">WORKSPACE</div>
          <h1>Settings</h1>
          <p className="muted">Manage cheque books, printer profiles and your backup.</p>
        </div>
      </div>

      <div className="settings-tabs" role="tablist" aria-label="Settings sections">
        <button className={tab === "series" ? "active" : ""} onClick={() => setTab("series")}>Cheque series</button>
        <button className={tab === "printers" ? "active" : ""} onClick={() => setTab("printers")}>Printer profiles</button>
        <button className={tab === "backup" ? "active" : ""} onClick={() => setTab("backup")}>Backup & restore</button>
      </div>

      {tab === "series" && (
        <section className="card settings-section">
          <div className="section-heading">
            <div>
              <h2>Cheque series</h2>
              <p className="muted">Keep separate cheque books and accounts organised.</p>
            </div>
            <button className="btn" disabled={busy} onClick={() => void addSeries()}>+ Add series</button>
          </div>
          <div className="record-list">
            {series.map((x) => (
              <div className="record-row" key={x.id}>
                <div>
                  <strong>{x.name}</strong>
                  <span className="muted">{x.bank_name || "Bank not set"} · Account {x.account_name || "not set"} · Next {x.next_number}</span>
                </div>
                <button className="btn ghost" onClick={() => void toggleSeries(x)}>{x.is_active ? "Deactivate" : "Activate"}</button>
              </div>
            ))}
            {!series.length && <div className="empty"><h3>No cheque series</h3><p className="muted">Add one when you manage multiple cheque books.</p></div>}
          </div>
        </section>
      )}

      {tab === "printers" && (
        <section className="card settings-section">
          <div className="section-heading">
            <div>
              <h2>Printer profiles</h2>
              <p className="muted">Printer-level offsets stay separate from cheque field calibration.</p>
            </div>
            <button className="btn" disabled={busy} onClick={() => void addPrinter()}>+ Add printer</button>
          </div>
          <div className="record-list">
            {printers.map((x) => (
              <div className="record-row" key={x.id}>
                <div>
                  <strong>{x.name} {x.is_default && <span className="mini-badge">Default</span>}</strong>
                  <span className="muted">{x.printer_name || "Printer name not set"} · {x.paper_width_mm} × {x.paper_height_mm} mm · {x.scale_percent}%</span>
                </div>
                <button className="btn ghost" onClick={() => void togglePrinter(x)}>{x.is_active ? "Deactivate" : "Activate"}</button>
              </div>
            ))}
            {!printers.length && <div className="empty"><h3>No printer profiles</h3><p className="muted">Add a profile for your physical printer.</p></div>}
          </div>
        </section>
      )}

      {tab === "backup" && (
        <section className="card settings-section">
          <div className="backup-hero">
            <div className="backup-icon">↥</div>
            <div>
              <h2>Protect your cheque records</h2>
              <p className="muted">Export your account data as a portable JSON backup, or restore a previous backup.</p>
            </div>
          </div>
          <div className="backup-actions">
            <button className="btn" disabled={busy} onClick={() => void exportBackup()}>{busy ? "Working…" : "Export backup"}</button>
            <button className="btn secondary" disabled={busy} onClick={() => fileRef.current?.click()}>Restore backup</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void restore(f); e.currentTarget.value = ""; }} />
          </div>
          <div className="helper">Backups contain cheque records, templates, calibration records, payees, printer profiles, series and print history. Keep them secure.</div>
        </section>
      )}

      {msg && <div className="form-message">{msg}</div>}
    </main>
  );
}
