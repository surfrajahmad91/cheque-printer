"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type DesignerState = {
  date: string;
  payee: string;
  amount: number;
  amountInWords: string;
  calibration: Record<string, unknown>;
  [key: string]: unknown;
};

function readNumber(doc: Document, id: string, fallback = 0) {
  const el = doc.getElementById(id) as HTMLInputElement | null;
  const n = Number(el?.value);
  return Number.isFinite(n) ? n : fallback;
}

function readValue(doc: Document, id: string, fallback = "") {
  const el = doc.getElementById(id) as HTMLInputElement | null;
  return el?.value ?? fallback;
}

function readText(doc: Document, id: string) {
  return (doc.getElementById(id)?.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function DesignerShell() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState("Loading v24 designer…");
  const [saving, setSaving] = useState(false);
  const [printNotes, setPrintNotes] = useState("");
  const router = useRouter();

  const readDesignerState = useCallback((): DesignerState | null => {
    const doc = frame.current?.contentDocument;
    if (!doc) return null;
    const amount = readNumber(doc, "amountInput", 0);
    const words = [readText(doc, "wordsLine1"), readText(doc, "wordsLine2")].filter(Boolean).join(" ").trim();
    return {
      date: readValue(doc, "dateInput"),
      payee: readValue(doc, "payeeInput"),
      amount,
      amountInWords: words,
      calibration: {
        acPayee: { x: readNumber(doc, "x", 10), y: readNumber(doc, "y", 10), font: readNumber(doc, "font", 12), angle: readNumber(doc, "angle", -40), lineWidth: readNumber(doc, "lineWidth", 25), lineGap: readNumber(doc, "lineGap", 0), topLineY: readNumber(doc, "topLineY", -2.3), bottomLineY: readNumber(doc, "bottomLineY", 2.3) },
        date: { x: readNumber(doc, "dateX", 0), y: readNumber(doc, "dateY", 0), font: readNumber(doc, "dateFont", 12), spacing: readNumber(doc, "dateSpacing", 0.8) },
        payee: { x: readNumber(doc, "payeeX", 0), y: readNumber(doc, "payeeY", 0), font: readNumber(doc, "payeeFont", 12), width: readNumber(doc, "payeeWidth", 70) },
        amount: { x: readNumber(doc, "amountX", 0), y: readNumber(doc, "amountY", 0), font: readNumber(doc, "amountFont", 12), width: readNumber(doc, "amountWidth", 35) },
        words: { font: readNumber(doc, "wordsFont", 11), line1: { x: readNumber(doc, "words1X", 0), y: readNumber(doc, "words1Y", 0), width: readNumber(doc, "words1Width", 120), height: readNumber(doc, "words1Height", 6) }, line2: { x: readNumber(doc, "words2X", 0), y: readNumber(doc, "words2Y", 0), width: readNumber(doc, "words2Width", 120), height: readNumber(doc, "words2Height", 6) } },
      },
    };
  }, []);

  const saveDraft = useCallback(async () => {
    const state = readDesignerState();
    if (!state) { setStatus("Designer is still loading…"); return; }
    setSaving(true); setStatus("Saving draft…");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { error } = await supabase.from("cheques").insert({ user_id: user.id, cheque_date: state.date, payee: state.payee, amount: state.amount, amount_in_words: state.amountInWords, status: "draft", layout_snapshot: state, notes: "" });
    setSaving(false); setStatus(error ? `Unable to save: ${error.message}` : "Draft saved ✓");
  }, [readDesignerState, router]);

  const printCheque = useCallback(async () => {
    const state = readDesignerState();
    if (!state) { setStatus("Designer is still loading…"); return; }
    setSaving(true); setStatus("Preparing print…");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: cheque, error: insertError } = await supabase.from("cheques").insert({ user_id: user.id, cheque_date: state.date, payee: state.payee, amount: state.amount, amount_in_words: state.amountInWords, status: "draft", layout_snapshot: state, notes: printNotes }).select("id").single();
    if (insertError || !cheque) { setSaving(false); setStatus(`Unable to prepare print: ${insertError?.message || "unknown error"}`); return; }

    const { error } = await supabase.rpc("record_cheque_print", { p_cheque_id: cheque.id, p_notes: printNotes });
    if (error) { setSaving(false); setStatus(`Print was not recorded: ${error.message}`); return; }

    setSaving(false); setStatus("Saved ✓ — opening print dialog…");
    frame.current?.contentWindow?.print();
  }, [printNotes, readDesignerState, router]);

  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;
    const onLoad = () => {
      setStatus("Ready");
      try {
        const doc = iframe.contentDocument;
        const printButton = doc?.getElementById("print") as HTMLButtonElement | null;
        if (!printButton || printButton.dataset.appWrapped === "1") return;
        printButton.dataset.appWrapped = "1";
        printButton.onclick = () => void printCheque();
      } catch { setStatus("Ready — designer loaded"); }
    };
    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [printCheque]);

  return (
    <div className="designer-wrap">
      <div className="designer-actions">
        <button className="btn secondary" disabled={saving} onClick={() => void saveDraft()}>{saving ? "Saving…" : "Save Draft"}</button>
        <input className="notes-input" value={printNotes} onChange={(e) => setPrintNotes(e.target.value)} placeholder="Print note (optional)" aria-label="Print note" />
        <button className="btn" disabled={saving} onClick={() => void printCheque()}>{saving ? "Preparing…" : "Print Cheque"}</button>
        <span className="badge designer-status">{status}</span>
      </div>
      <iframe ref={frame} className="designer-frame" src="/cheque-designer-v24.html" title="Cheque designer v24" />
    </div>
  );
}
