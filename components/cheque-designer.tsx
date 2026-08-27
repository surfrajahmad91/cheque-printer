"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Key = "acPayee" | "acPayeeTopLine" | "acPayeeBottomLine" | "date" | "payee" | "amount" | "words1" | "words2";
type C = { x: number; y: number; font?: number; width?: number; angle?: number; spacing?: number };
type Template = { id: string; name: string; payee: string; calibration: Record<Key, C> };
type Props = { initialDraft?: { id: string; chequeNumber?: string | number; payee: string; date: string; amount: string; notes: string; config?: Record<string, C> } };
type Drag = { k: Key; dx: number; dy: number };

const initial: Record<Key, C> = {
  acPayee: { x: 14, y: 12, font: 12, angle: -40 },
  acPayeeTopLine: { x: 14, y: 9.7, width: 24 },
  acPayeeBottomLine: { x: 14, y: 14.3, width: 24 },
  date: { x: 154, y: 10, font: 12, spacing: 1.1 },
  payee: { x: 30, y: 28, font: 12, width: 90 },
  amount: { x: 154, y: 29, font: 12, width: 35 },
  words1: { x: 30, y: 39, font: 11, width: 120 },
  words2: { x: 30, y: 46, font: 11, width: 120 },
};

const ones = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const u100 = (n: number) => n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ` ${ones[n % 10]}` : "");
function group(n: number): string {
  if (n < 100) return u100(n);
  if (n < 1000) return `${ones[Math.floor(n / 100)]} hundred${n % 100 ? ` ${u100(n % 100)}` : ""}`;
  if (n < 100000) return `${u100(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${group(n % 1000)}` : ""}`;
  if (n < 10000000) return `${u100(Math.floor(n / 100000))} lakh${n % 100000 ? ` ${group(n % 100000)}` : ""}`;
  return `${group(Math.floor(n / 10000000))} crore${n % 10000000 ? ` ${group(n % 10000000)}` : ""}`;
}
const properCase = (s: string) => s.replace(/\b[a-z]/g, (m) => m.toUpperCase());
function amountWords(s: string) {
  const clean = s.trim();
  if (!clean) return "";
  const [wholePart, decimalPart = ""] = clean.split(".");
  const a = Number(wholePart);
  const p = Number(decimalPart.padEnd(2, "0"));
  if (!Number.isFinite(a) || !Number.isFinite(p) || a < 0 || p < 0) return "";
  return properCase(`${group(a)}${p ? ` and ${group(p)} Paise` : ""} Only`);
}
const formatIndianAmount = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";
};
function measureText(text: string, pt: number) {
  if (typeof document === "undefined") return text.length * pt * 0.55;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * pt * 0.55;
  ctx.font = `${pt * 96 / 72}px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  return ctx.measureText(text).width;
}
function wrapTwoLines(s: string, w1: number, font1: number): [string, string] {
  if (!s) return ["", ""];
  const width1Px = Math.max(1, w1 * 96 / 25.4);
  const words = s.split(/\s+/).filter(Boolean);
  let line1 = "";
  let index = 0;
  for (; index < words.length; index++) {
    const candidate = line1 ? `${line1} ${words[index]}` : words[index];
    if (measureText(candidate, font1) <= width1Px) line1 = candidate;
    else break;
  }
  if (!line1 && words.length) { line1 = words[0]; index = 1; }
  return [line1, words.slice(index).join(" ")];
}
function validDate(s: string) {
  if (!/^\d{8}$/.test(s)) return false;
  const d = +s.slice(0, 2), m = +s.slice(2, 4), y = +s.slice(4);
  return y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= new Date(y, m, 0).getDate();
}
const isoDate = (s: string) => `${s.slice(4)}-${s.slice(2, 4)}-${s.slice(0, 2)}`;
function normalizeConfig(raw: any): Record<Key, C> {
  const source = raw && typeof raw === "object" ? raw : {};
  const out: Record<Key, C> = { ...initial };
  (Object.keys(initial) as Key[]).forEach((k) => {
    if (source[k] && typeof source[k] === "object") out[k] = { ...initial[k], ...source[k] };
  });
  // Convert templates saved by the earlier combined A/C PAYEE format without
  // overwriting independently stored line calibrations in newer templates.
  if (source.acPayee && typeof source.acPayee === "object") {
    const old = source.acPayee;
    out.acPayee = { ...out.acPayee, x: old.x ?? out.acPayee.x, y: old.y ?? out.acPayee.y, font: old.font ?? out.acPayee.font, angle: old.angle ?? out.acPayee.angle };
    if (!source.acPayeeTopLine || typeof source.acPayeeTopLine !== "object") {
      out.acPayeeTopLine = { ...out.acPayeeTopLine, x: old.x ?? out.acPayeeTopLine.x, y: (old.y ?? out.acPayee.y) + (old.topLineY ?? -2.3), width: old.width ?? out.acPayeeTopLine.width };
    }
    if (!source.acPayeeBottomLine || typeof source.acPayeeBottomLine !== "object") {
      out.acPayeeBottomLine = { ...out.acPayeeBottomLine, x: old.x ?? out.acPayeeBottomLine.x, y: (old.y ?? out.acPayee.y) + (old.bottomLineY ?? 2.3), width: old.width ?? out.acPayeeBottomLine.width };
    }
  }
  return out;
}

export function ChequeDesigner({ initialDraft }: Props) {
  const router = useRouter();
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [cfg, setCfg] = useState<Record<Key, C>>(normalizeConfig(initialDraft?.config || initial));
  const [sel, setSel] = useState<Key>("payee");
  const [chequeNumber, setChequeNumber] = useState(initialDraft?.chequeNumber != null ? String(initialDraft.chequeNumber) : "");
  const [payee, setPayee] = useState(initialDraft?.payee || "");
  const [date, setDate] = useState(initialDraft?.date || "");
  const [amount, setAmount] = useState(initialDraft?.amount || "");
  const [notes, setNotes] = useState(initialDraft?.notes || "");
  const [bg, setBg] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(initialDraft ? "Draft loaded ✓" : "Ready");
  const [error, setError] = useState("");

  const words = useMemo(() => amountWords(amount), [amount]);
  const [w1, w2] = useMemo(() => wrapTwoLines(words, cfg.words1.width || 120, cfg.words1.font || 11), [words, cfg.words1.width, cfg.words1.font]);

  const loadTemplates = async () => {
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return;
    const { data, error: e } = await s.from("cheque_templates").select("id,name,layout,updated_at").eq("user_id", user.id).eq("is_active", true).order("updated_at", { ascending: false });
    if (e) { setError(e.message); return; }
    setTemplates((data || []).map((t: any) => ({ id: t.id, name: t.name, payee: t.layout?.payee || "", calibration: normalizeConfig(t.layout?.calibration) })));
  };
  useEffect(() => { void loadTemplates(); }, []);
  useEffect(() => {
    if (initialDraft || typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("template");
    if (!id) return;
    const found = templates.find((t) => t.id === id);
    if (found) { setSelectedTemplate(found.id); setPayee(found.payee); setCfg(normalizeConfig(found.calibration)); setStatus(`Template loaded: ${found.name} ✓`); }
  }, [templates, initialDraft]);
  const chooseTemplate = (id: string) => {
    setSelectedTemplate(id);
    if (!id) { setStatus("Ready"); return; }
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setCfg(normalizeConfig(t.calibration)); setPayee(t.payee); setStatus(`Template loaded: ${t.name} ✓`);
  };
  const field = (k: Key, f: keyof C, v: number) => setCfg((x) => ({ ...x, [k]: { ...x[k], [f]: v } }));
  const down = (e: React.PointerEvent, k: Key) => {
    e.stopPropagation();
    const r = canvas.current?.getBoundingClientRect(); if (!r) return;
    drag.current = { k, dx: e.clientX - r.left - cfg[k].x * r.width / 200, dy: e.clientY - r.top - cfg[k].y * r.height / 100 };
    setSel(k); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current, r = canvas.current?.getBoundingClientRect(); if (!d || !r) return;
    setCfg((c) => ({ ...c, [d.k]: { ...c[d.k], x: Math.max(0, Math.min(200, (e.clientX - r.left - d.dx) * 200 / r.width)), y: Math.max(0, Math.min(100, (e.clientY - r.top - d.dy) * 100 / r.height)) } }));
  };

  const saveTemplate = async (updateExisting = false) => {
    setError("");
    const name = templateName.trim() || templates.find((t) => t.id === selectedTemplate)?.name || "";
    if (!name) { setError("Enter a template name."); return; }
    if (!payee.trim()) { setError("Enter the payee name before saving a template."); return; }
    setBusy(true);
    try {
      const s = createClient(); const { data: { user } } = await s.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const layout = { version: 2, chequeWidthMm: 200, chequeHeightMm: 100, payee: payee.trim(), calibration: cfg };
      if (updateExisting && selectedTemplate) {
        const r = await s.from("cheque_templates").update({ name, layout, updated_at: new Date().toISOString() }).eq("id", selectedTemplate).eq("user_id", user.id).select("id,name,layout").single();
        if (r.error) throw r.error;
      } else {
        const r = await s.from("cheque_templates").insert({ user_id: user.id, name, layout, cheque_width_mm: 200, cheque_height_mm: 100, is_active: true }).select("id,name,layout").single();
        if (r.error) throw r.error;
        setSelectedTemplate(r.data.id);
      }
      setTemplateName(""); setStatus(`Template saved ✓ — ${name}`); await loadTemplates();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save template"); }
    finally { setBusy(false); }
  };

  const save = async (print = false) => {
    setError(""); const normalizedChequeNumber = chequeNumber.trim();
    if (!normalizedChequeNumber || !/^\d+$/.test(normalizedChequeNumber) || !/[1-9]/.test(normalizedChequeNumber)) { setError("Enter the actual cheque number (positive whole number). Leading zeros are allowed."); return; }
    if (!payee.trim()) { setError("Enter the payee name."); return; }
    if (!validDate(date)) { setError("Enter a valid date in DDMMYYYY format."); return; }
    if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(amount) || +amount <= 0) { setError("Enter a valid amount with up to 2 decimal places."); return; }
    setBusy(true); setStatus(print ? "Saving & preparing print…" : "Saving draft…");
    try {
      const s = createClient(); const { data: { user } } = await s.auth.getUser(); if (!user) { router.push("/login"); return; }
      let { data: payeeRow, error: pe } = await s.from("payees").select("id").eq("user_id", user.id).eq("name", payee.trim()).maybeSingle(); if (pe) throw pe;
      if (!payeeRow) { const r = await s.from("payees").insert({ user_id: user.id, name: payee.trim() }).select("id").single(); if (r.error) throw r.error; payeeRow = r.data; }
      const snap = { source: "native-cheque-designer", date, payee: payee.trim(), chequeNumber: normalizedChequeNumber, amount: +amount, amountInWords: words, calibration: cfg, templateId: selectedTemplate || null };
      if (!print) {
        if (initialDraft?.id) {
          const r = await s.from("cheques").update({ cheque_number: normalizedChequeNumber, payee_id: payeeRow.id, cheque_date: isoDate(date), amount: +amount, amount_in_words: words, layout_snapshot: snap, notes: notes.trim(), updated_at: new Date().toISOString() }).eq("id", initialDraft.id).eq("user_id", user.id).eq("status", "draft").select("id").single(); if (r.error) throw r.error;
        } else {
          const { data: existing, error: de } = await s.from("cheques").select("id").eq("user_id", user.id).eq("status", "draft").eq("cheque_number", normalizedChequeNumber).maybeSingle(); if (de) throw de;
          if (existing) { const r = await s.from("cheques").update({ payee_id: payeeRow.id, cheque_date: isoDate(date), amount: +amount, amount_in_words: words, layout_snapshot: snap, notes: notes.trim(), updated_at: new Date().toISOString() }).eq("id", existing.id).eq("user_id", user.id).select("id").single(); if (r.error) throw r.error; }
          else { const r = await s.from("cheques").insert({ user_id: user.id, cheque_series_id: null, cheque_number: normalizedChequeNumber, payee_id: payeeRow.id, cheque_date: isoDate(date), amount: +amount, amount_in_words: words, status: "draft", layout_snapshot: snap, notes: notes.trim() }).select("id").single(); if (r.error) throw r.error; }
        }
      } else {
        const { error: pr } = await s.rpc("create_and_print_cheque", { p_cheque_number: normalizedChequeNumber, p_payee_id: payeeRow.id, p_cheque_date: isoDate(date), p_amount: +amount, p_amount_in_words: words, p_layout_snapshot: snap, p_notes: notes.trim(), p_draft_id: initialDraft?.id || null }); if (pr) throw pr;
      }
      setStatus(print ? "Saved ✓ — printing…" : "Draft saved ✓"); if (print) window.print();
    } catch (e) { setStatus("Unable to save"); setError(e instanceof Error ? e.message : "Unable to save cheque"); }
    finally { setBusy(false); }
  };

  const c = cfg[sel];
  const itemStyle = (k: Key): React.CSSProperties => ({ left: `${cfg[k].x}mm`, top: `${cfg[k].y}mm`, fontSize: cfg[k].font ? `${cfg[k].font}pt` : undefined, width: cfg[k].width ? `${cfg[k].width}mm` : undefined, transform: cfg[k].angle != null ? `rotate(${cfg[k].angle}deg)` : undefined });
  const dateDigits = date.split("");

  return <div className="designer-wrap">
    <section className="designer-header">
      <div><div className="eyebrow">CHEQUE PRINTING</div><h1>Cheque Designer</h1><p>Build once, reuse your cheque layout, and print with confidence.</p></div>
      <div className="header-chip"><span className="dot" /> 200 × 100 mm</div>
    </section>

    <div className="designer-layout">
      <aside className="designer-panel">
        <div className="panel-intro"><div className="panel-icon">✦</div><div><h2>Cheque details</h2><p>Enter the transaction and choose a saved layout.</p></div></div>

        <div className="designer-card">
          <div className="card-heading"><span>Template</span><small>Reuse calibration</small></div>
          <label>Choose template<select value={selectedTemplate} onChange={(e) => chooseTemplate(e.target.value)} disabled={busy}><option value="">Blank / no template</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.payee ? ` — ${t.payee}` : ""}</option>)}</select></label>
          <label>Template name<input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. SBI Current Account" disabled={busy} /></label>
          <div className="action-row"><button className="btn secondary" type="button" onClick={() => void saveTemplate(false)} disabled={busy}>Save as Template</button>{selectedTemplate && <button className="btn ghost" type="button" onClick={() => void saveTemplate(true)} disabled={busy}>Update</button>}</div>
        </div>

        <div className="designer-card">
          <div className="card-heading"><span>Cheque details</span><small>Cheque number is stored only</small></div>
          <label>Actual cheque number<input inputMode="numeric" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value.replace(/\D/g, "").slice(0, 18))} placeholder="e.g. 002536" disabled={busy} /></label>
          <div className="helper">The number identifies the physical cheque but is never rendered or printed by this app.</div>
          <label>Payee<input value={payee} onChange={(e) => setPayee(e.target.value)} disabled={busy} placeholder="Payee name" /></label>
          <label>Date <span className="label-hint">DDMMYYYY</span><input inputMode="numeric" value={date} onChange={(e) => setDate(e.target.value.replace(/\D/g, "").slice(0, 8))} disabled={busy} placeholder="28082026" /></label>
          <label>Amount<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))} disabled={busy} placeholder="0.00" /></label>
          <label>Notes<input className="notes-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" disabled={busy} /></label>
          <label className="upload">Calibration background<input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; setBg(f ? URL.createObjectURL(f) : null); }} disabled={busy} /><span>Upload original cheque image for on-screen alignment</span></label>
        </div>

        <div className="designer-card calibration-card">
          <div className="card-heading"><span>Field calibration</span><small>Drag on preview or edit values</small></div>
          <label>Field<select value={sel} onChange={(e) => setSel(e.target.value as Key)}><option value="acPayee">A/C PAYEE text</option><option value="acPayeeTopLine">A/C PAYEE — top line</option><option value="acPayeeBottomLine">A/C PAYEE — bottom line</option><option value="date">Date digits</option><option value="payee">Payee</option><option value="amount">Numeric amount</option><option value="words1">Amount in words — line 1</option><option value="words2">Amount in words — line 2</option></select></label>
          <div className="calibration-grid"><label>X<input type="number" step="0.1" value={c.x} onChange={(e) => field(sel, "x", +e.target.value)} /></label><label>Y<input type="number" step="0.1" value={c.y} onChange={(e) => field(sel, "y", +e.target.value)} /></label></div>
          {c.font != null && <label>Font size <span className="label-hint">pt</span><input type="number" step="0.5" value={c.font} onChange={(e) => field(sel, "font", +e.target.value)} /></label>}
          {c.width != null && <label>Width <span className="label-hint">mm</span><input type="number" step="0.1" value={c.width} onChange={(e) => field(sel, "width", +e.target.value)} /></label>}
          {sel === "acPayee" && <label>Angle <span className="label-hint">degrees</span><input type="number" step="1" value={c.angle ?? 0} onChange={(e) => field(sel, "angle", +e.target.value)} /></label>}
          {sel === "date" && <label>Digit spacing <span className="label-hint">mm</span><input type="number" step="0.1" value={c.spacing ?? 0} onChange={(e) => field(sel, "spacing", +e.target.value)} /></label>}
          {(sel === "acPayeeTopLine" || sel === "acPayeeBottomLine") && <div className="helper">This line is calibrated independently from the A/C PAYEE text and the other line.</div>}
          {sel === "words1" && <div className="helper">Line 1 stays on one line. Remaining words flow to line 2.</div>}
          {sel === "words2" && <div className="helper">Line 2 may wrap naturally if its calibrated width is reached.</div>}
        </div>

        <div className="save-bar"><button className="btn secondary" type="button" onClick={() => void save(false)} disabled={busy}>Save Draft</button><button className="btn" type="button" onClick={() => void save(true)} disabled={busy}>Save &amp; Print</button></div>
        {error && <div className="designer-error">{error}</div>}
        <div className="designer-status"><span className="status-dot" />{status}</div>
      </aside>

      <section className="designer-stage">
        <div className="preview-heading"><div><strong>Live cheque preview</strong><span>Calibration guides are for screen use only.</span></div><span className="preview-size">200 × 100 mm</span></div>
        <div ref={canvas} className="cheque-canvas" style={{ backgroundImage: bg ? `url(${bg})` : undefined }} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
          <div className={`cal-item ac-text ${sel === "acPayee" ? "selected" : ""}`} style={itemStyle("acPayee")} onPointerDown={(e) => down(e, "acPayee")}>A/C PAYEE</div>
          <div className={`cal-item ac-line ac-top-line ${sel === "acPayeeTopLine" ? "selected" : ""}`} style={itemStyle("acPayeeTopLine")} onPointerDown={(e) => down(e, "acPayeeTopLine")} />
          <div className={`cal-item ac-line ac-bottom-line ${sel === "acPayeeBottomLine" ? "selected" : ""}`} style={itemStyle("acPayeeBottomLine")} onPointerDown={(e) => down(e, "acPayeeBottomLine")} />
          <div className={`cal-item date ${sel === "date" ? "selected" : ""}`} style={itemStyle("date")} onPointerDown={(e) => down(e, "date")}>{dateDigits.map((d, i) => <span key={`${i}-${d}`} style={{ marginRight: i === dateDigits.length - 1 ? 0 : `${cfg.date.spacing ?? 0.8}mm` }}>{d}</span>)}</div>
          <div className={`cal-item payee ${sel === "payee" ? "selected" : ""}`} style={itemStyle("payee")} onPointerDown={(e) => down(e, "payee")}>{payee}</div>
          <div className={`cal-item amount ${sel === "amount" ? "selected" : ""}`} style={itemStyle("amount")} onPointerDown={(e) => down(e, "amount")}>{formatIndianAmount(amount)}</div>
          <div className={`cal-item words1 ${sel === "words1" ? "selected" : ""}`} style={itemStyle("words1")} onPointerDown={(e) => down(e, "words1")}>{w1}</div>
          <div className={`cal-item words2 ${sel === "words2" ? "selected" : ""}`} style={itemStyle("words2")} onPointerDown={(e) => down(e, "words2")}>{w2}</div>
        </div>
      </section>
    </div>
  </div>;
}
