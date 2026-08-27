"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Snapshot = Record<string, unknown>;

function num(doc: Document, id: string, fallback = 0) {
  const value = Number((doc.getElementById(id) as HTMLInputElement | null)?.value);
  return Number.isFinite(value) ? value : fallback;
}
function val(doc: Document, id: string) {
  return (doc.getElementById(id) as HTMLInputElement | null)?.value ?? "";
}

export function DesignerShell() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [notes, setNotes] = useState("");
  const router = useRouter();

  const snapshot = useCallback((): Snapshot | null => {
    const doc = frame.current?.contentDocument;
    if (!doc) return null;
    const amount = Number(val(doc, "amountInput"));
    const date = val(doc, "dateInput").replace(/\D/g, "").slice(0, 8);
    const payee = val(doc, "payeeInput");
    const words1 = doc.getElementById("wordsLine1")?.textContent?.trim() ?? "";
    const words2 = doc.getElementById("wordsLine2")?.textContent?.trim() ?? "";
    return {
      source: "cheque-designer-v24",
      date,
      payee,
      amount: Number.isFinite(amount) ? amount : 0,
      amountInWords: [words1, words2].filter(Boolean).join(" "),
      calibration: {
        acPayee: { x: num(doc, "x", 10), y: num(doc, "y", 10), font: num(doc, "font", 12), angle: num(doc, "angle", -40), lineWidth: num(doc, "lineWidth", 25), lineGap: num(doc, "lineGap", 0), topLineY: num(doc, "topLineY", -2.3), bottomLineY: num(doc, "bottomLineY", 2.3) },
        date: { x: num(doc, "dateX", 150), y: num(doc, "dateY", 8), font: num(doc, "dateFont", 12), spacing: num(doc, "dateSpacing", 0.8) },
        payee: { x: num(doc, "payeeX", 30), y: num(doc, "payeeY", 27), font: num(doc, "payeeFont", 12), width: num(doc, "payeeWidth", 70) },
        amount: { x: num(doc, "amountX", 155), y: num(doc, "amountY", 28), font: num(doc, "amountFont", 12), width: num(doc, "amountWidth", 35) },
        words: { font: num(doc, "wordsFont", 11), line1: { x: num(doc, "words1X", 35), y: num(doc, "words1Y", 38), width: num(doc, "words1Width", 120), height: num(doc, "words1Height", 6) }, line2: { x: num(doc, "words2X", 35), y: num(doc, "words2Y", 44), width: num(doc, "words2Width", 120), height: num(doc, "words2Height", 6) } },
      },
    };
  }, []);

  const saveDraft = useCallback(async () => {
    const state = snapshot();
    if (!state) { setStatus("Designer is still loading…"); return; }
    setSaving(true); setStatus("Saving draft…");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { error } = await supabase.from("cheques").insert({
      user_id: user.id,
      cheque_date: state.date,
      payee: state.payee,
      amount: state.amount,
      amount_in_words: state.amountInWords,
      status: "draft",
      layout_snapshot: state,
      notes: "",
    });
    setSaving(false);
    setStatus(error ? `Unable to save: ${error.message}` : "Draft saved ✓");
  }, [router, snapshot]);

  const saveAndPrint = useCallback(async () => {
    const state = snapshot();
    if (!state) { setStatus("Designer is still loading…"); return; }
    setSaving(true); setStatus("Saving cheque…");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: cheque, error: createError } = await supabase.from("cheques").insert({
      user_id: user.id,
      cheque_date: state.date,
      payee: state.payee,
      amount: state.amount,
      amount_in_words: state.amountInWords,
      status: "draft",
      layout_snapshot: state,
      notes,
    }).select("id").single();

    if (createError || !cheque) {
      setSaving(false); setStatus(`Unable to save: ${createError?.message || "unknown error"}`); return;
    }

    const { error: printError } = await supabase.rpc("record_cheque_print", {
      p_cheque_id: cheque.id,
      p_notes: notes,
    });
    setSaving(false);
    if (printError) { setStatus(`Saved, but print was not recorded: ${printError.message}`); return; }

    setStatus("Saved ✓ — opening print dialog…");
    frame.current?.contentWindow?.print();
  }, [notes, router, snapshot]);

  return (
    <div className="designer-wrap">
      <div className="designer-actions">
        <button className="btn secondary" disabled={saving} onClick={() => void saveDraft()}>{saving ? "Saving…" : "Save Draft"}</button>
        <input className="notes-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Print note (optional)" aria-label="Print note" />
        <button className="btn" disabled={saving} onClick={() => void saveAndPrint()}>{saving ? "Preparing…" : "Save & Print"}</button>
        <span className="badge designer-status">{status}</span>
      </div>
      <iframe ref={frame} className="designer-frame" src="/cheque-designer-v24.html" title="Cheque designer v24" />
    </div>
  );
}
