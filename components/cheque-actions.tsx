"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function ChequeActions({ chequeId, status, notes: initialNotes }: { chequeId: string; status: string; notes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const locked = status === "void";

  async function saveNotes() {
    setBusy(true); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.from("cheques").update({ notes, updated_at: new Date().toISOString() }).eq("id", chequeId);
    setBusy(false); setMessage(error ? error.message : "Notes saved ✓");
  }

  async function changeStatus(next: "cancelled" | "void") {
    if (locked) return;
    const wording = next === "void" ? "VOID this cheque? This should be used when it must never be printed again." : "cancel this cheque?";
    if (!confirm(wording)) return;
    setBusy(true); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.from("cheques").update({ status: next, updated_at: new Date().toISOString() }).eq("id", chequeId).neq("status", "void");
    setBusy(false); setMessage(error ? error.message : `Cheque marked ${next} ✓`);
    if (!error) router.refresh();
  }

  return (
    <section className="card actions-card">
      <div className="toolbar compact"><div><h2>Notes & actions</h2><p className="muted">Keep a private note with this cheque.</p></div></div>
      <textarea className="notes-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note, reference, or reason…" rows={4} />
      <div className="action-row">
        <button className="btn" disabled={busy} onClick={saveNotes}>{busy ? "Saving…" : "Save notes"}</button>
        {!locked && status !== "cancelled" && <button className="btn danger" disabled={busy} onClick={() => changeStatus("cancelled")}>Cancel cheque</button>}
        {!locked && <button className="btn danger" disabled={busy} onClick={() => changeStatus("void")}>Void cheque</button>}
      </div>
      {message && <p className="form-message">{message}</p>}
    </section>
  );
}
