"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function DesignerShell() {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [printNotes, setPrintNotes] = useState("");
  const router = useRouter();

  async function saveDraft() {
    setSaving(true); setStatus("Saving draft…");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { error } = await supabase.from("cheques").insert({ user_id: user.id, status: "draft", notes: "", layout_snapshot: { source: "v24" } });
    setSaving(false);
    setStatus(error ? `Unable to save: ${error.message}` : "Draft saved ✓");
  }

  return (
    <div className="designer-wrap">
      <div className="designer-actions">
        <button className="btn secondary" disabled={saving} onClick={() => void saveDraft()}>{saving ? "Saving…" : "Save Draft"}</button>
        <input className="notes-input" value={printNotes} onChange={(e) => setPrintNotes(e.target.value)} placeholder="Print note (optional)" aria-label="Print note" />
        <span className="badge designer-status">{status}</span>
      </div>
      <iframe className="designer-frame" src="/cheque-designer-v24.html" title="Cheque designer v24" />
    </div>
  );
}
