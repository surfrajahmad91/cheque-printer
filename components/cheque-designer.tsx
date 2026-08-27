"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Key = "acPayee" | "chequeNumber" | "date" | "payee" | "amount" | "words1" | "words2";
type C = { x: number; y: number; font: number; width?: number; angle?: number; spacing?: number; topLineY?: number; bottomLineY?: number };
type Template = { id: string; name: string; payee: string; calibration: Record<Key, C> };
type Props = { initialDraft?: { id: string; chequeNumber?: string | number; payee: string; date: string; amount: string; notes: string; config?: Record<Key, C> } };
type Drag = { k: Key; dx: number; dy: number };
type LineDrag = { line: "top" | "bottom"; offset: number };

const initial: Record<Key, C> = {
  acPayee: { x: 14, y: 12, font: 12, width: 24, angle: -40, topLineY: -2.3, bottomLineY: 2.3 },
  chequeNumber: { x: 145, y: 8, font: 10, width: 40, spacing: 1.2 },
  date: { x: 154, y: 10, font: 12, spacing: 0.8 },
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
function wrapTwo(s: string, w1: number, _w2: number, font1: number, _font2: number): [string, string] {
  if (!s) return ["", ""];
  const width1Px = Math.max(1, w1 * 96 / 25.4);
  let measure: (text: string, fontPt: number) => number;
  if (typeof document !== "undefined") {
    const ctx = document.createElement("canvas").getContext("2d");
    measure = ctx ? (text, pt) => { ctx.font = `${pt * 96 / 72}px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; return ctx.measureText(text).width; } : (text, pt) => text.length * pt * 0.55;
  } else measure = (text, pt) => text.length * pt * 0.55;
  const words = s.split(/\s+/).filter(Boolean);
  let line1 = "";
  let index = 0;
  for (; index < words.length; index++) {
    const candidate = line1 ? `${line1} ${words[index]}` : words[index];
    if (measure(candidate, font1) <= width1Px) line1 = candidate;
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
  const out: Record<Key, C> = { ...initial };
  const source = raw && typeof raw === "object" ? raw : {};
  (Object.keys(initial) as Key[]).forEach((k) => { if (source[k] && typeof source[k] === "object") out[k] = { ...initial[k], ...source[k] }; });
  return out;
}

export function ChequeDesigner({ initialDraft }: Props) {
  const router = useRouter();
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const lineDrag = useRef<LineDrag | null>(null);
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
  const [w1, w2] = useMemo(() => wrapTwo(words, cfg.words1.width || 120, cfg.words2.width || 120, cfg.words1.font || 11, cfg.words2.font || 11), [words, cfg.words1.width, cfg.words2.width, cfg.words1.font, cfg.words2.font]);

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
    e.stopPropagation(); const r = canvas.current?.getBoundingClientRect(); if (!r) return;
    drag.current = { k, dx: e.clientX - r.left - cfg[k].x * r.width / 200, dy: e.clientY - r.top - cfg[k].y * r.height / 100 }; setSel(k); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current, r = canvas.current?.getBoundingClientRect(); if (!d || !r) return;
    setCfg((c) => ({ ...c, [d.k]: { ...c[d.k], x: Math.max(0, Math.min(200, (e.clientX - r.left - d.dx) * 200 / r.width)), y: Math.max(0, Math.min(100, (e.clientY - r.top - d.dy) * 100 / r.height)) } }));
  };
  const lineDown = (e: React.PointerEvent, line: "top" | "bottom") => {
    e.stopPropagation(); const r = canvas.current?.getBoundingClientRect(); if (!r) return;
    const current = line === "top" ? cfg.acPayee.topLineY! : cfg.acPayee.bottomLineY!;
    lineDrag.current = { line, offset: e.clientY - r.top - (cfg.acPayee.y + current) * r.height / 100 }; setSel("acPayee"); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const moveLine = (e: React.PointerEvent) => {
    const d = lineDrag.current, r = canvas.current?.getBoundingClientRect(); if (!d || !r) return;
    field("acPayee", d.line === "top" ? "topLineY" : "bottomLineY", (e.clientY - r.top - d.offset) * 100 / r.height - cfg.acPayee.y);
  };
  const saveTemplate = async (updateExisting = false) => {
    setError(""); const name = templateName.trim() || templates.find((t) => t.id === selectedTemplate)?.name || "";
    if (!name) { setError("Enter a template name."); return; }
    if (!payee.trim()) { setError("Enter the payee name before saving a template."); return; }
    setBusy(true);
    try {
      const s = createClient(); const { data: { user } } = await s.auth.getUser(); if (!user) { router.push("/login"); return; }
      const layout = { version: 1, chequeWidthMm: 200, chequeHeightMm: 100, payee: payee.trim(), calibration: cfg };
      if (updateExisting && selectedTemplate) {
        const r = await s.from("cheque_templates").update({ name, layout, updated_at: new Date().toISOString() }).eq("id", selectedTemplate).eq("user_id", user.id).select("id,name,layout").single(); if (r.error) throw r.error;
      } else {
        const r = await s.from("cheque_templates").insert({ user_id: user.id, name, layout, cheque_width_mm: 200, cheque_height_mm: 100, is_active: true }).select("id,name,layout").single(); if (r.error) throw r.error;
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
  const itemStyle = (k: Key): React.CSSProperties => ({ left: `${cfg[k].x}mm`, top: `${cfg[k].y}mm`, fontSize: `${cfg[k].font}pt`, width: cfg[k].width ? `${cfg[k].width}mm` : undefined, letterSpacing: cfg[k].spacing ? `${cfg[k].spacing}mm` : undefined });
  const datePreview = date ? date.split("").join(" ") : "";
  const lineGap = Math.abs((cfg.acPayee.bottomLineY ?? 0) - (cfg.acPayee.topLineY ?? 0));

  return <div className="designer-wrap">
    <div className="designer-panel">
      <div className="designer-header">
        <div><div className="eyebrow">CHEQUE PRINTING</div><h2>Cheque Designer</h2><p className="muted">Calibrate once, save a template, and reuse it for every cheque.</p></div>
        <div className="size-chip">200 × 100 mm</div>
      </div>

      <div className="designer-grid">
        <section className="designer-card template-card">
          <div className="card-heading"><span className="card-icon">▦</span><div><h3>Design template</h3><p>Reuse a saved cheque layout.</p></div></div>
          <label>Choose template<select value={selectedTemplate} onChange={(e) => chooseTemplate(e.target.value)} disabled={busy}><option value="">Blank / no template</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.payee ? ` — ${t.payee}` : ""}</option>)}</select></label>
          <div className="template-save-row"><input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="New template name" disabled={busy} /><button className="btn secondary" type="button" onClick={() => void saveTemplate(false)} disabled={busy}>Save template</button></div>
          {selectedTemplate && <button className="text-action" type="button" onClick={() => void saveTemplate(true)} disabled={busy}>Update selected template</button>}
        </section>

        <section className="designer-card details-card">
          <div className="card-heading"><span className="card-icon">▤</span><div><h3>Cheque details</h3><p>The number is stored only; it is not printed.</p></div></div>
          <div className="details-grid">
            <label><span>Actual cheque number <em>stored only</em></span><input inputMode="numeric" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value.replace(/\D/g, "").slice(0, 18))} placeholder="e.g. 002536" disabled={busy} /></label>
            <label><span>Payee</span><input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Payee name" disabled={busy} /></label>
            <label><span>Date <em>DDMMYYYY</em></span><input inputMode="numeric" value={date} onChange={(e) => setDate(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="28082026" disabled={busy} /></label>
            <label><span>Amount <em>2 decimals on cheque</em></span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))} placeholder="0.00" disabled={busy} /></label>
            <label className="full"><span>Notes</span><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional note" disabled={busy} /></label>
            <label className="upload full"><span>Background for calibration <em>screen only</em></span><input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; setBg(f ? URL.createObjectURL(f) : null); }} disabled={busy} /></label>
          </div>
        </section>

        <section className="designer-card calibration-card">
          <div className="card-heading"><span className="card-icon">⌖</span><div><h3>Field calibration</h3><p>Drag fields on the cheque or enter exact values.</p></div></div>
          <div className="calibration-toolbar">
            <label className="field-select">Field<select value={sel} onChange={(e) => setSel(e.target.value as Key)}><option value="acPayee">A/C PAYEE + lines</option><option value="date">Date</option><option value="payee">Payee</option><option value="amount">Numeric Amount</option><option value="words1">Amount in Words — Line 1</option><option value="words2">Amount in Words — Line 2</option></select></label>
            <div className="calibration-note">{sel === "acPayee" ? "A/C PAYEE and its two calibration lines are controlled together." : "Width controls how far this field may extend."}</div>
          </div>
          <div className="calibration-grid">
            <label>X<input type="number" step="0.1" value={c.x} onChange={(e) => field(sel, "x", +e.target.value)} /></label>
            <label>Y<input type="number" step="0.1" value={c.y} onChange={(e) => field(sel, "y", +e.target.value)} /></label>
            <label>Font<input type="number" step="0.5" value={c.font} onChange={(e) => field(sel, "font", +e.target.value)} /></label>
            <label>Width<input type="number" step="0.1" value={c.width ?? ""} onChange={(e) => field(sel, "width", +e.target.value)} /></label>
            {(sel === "date") && <label>Digit spacing<input type="number" step="0.1" value={c.spacing ?? 0} onChange={(e) => field(sel, "spacing", +e.target.value)} /></label>}
            {sel === "acPayee" && <>
              <label>Angle<input type="number" step="1" value={c.angle ?? 0} onChange={(e) => field(sel, "angle", +e.target.value)} /></label>
              <label>Line length<input type="number" step="0.1" value={c.width ?? 0} onChange={(e) => field(sel, "width", +e.target.value)} /></label>
              <label>Line gap<input type="number" step="0.1" value={lineGap.toFixed(1)} onChange={(e) => { const gap = Math.max(0, +e.target.value); field("acPayee", "topLineY", -gap / 2); field("acPayee", "bottomLineY", gap / 2); }} /></label>
            </>}
          </div>
          {sel === "acPayee" && <div className="calibration-hint">Tip: drag either line directly in the preview to fine-tune its vertical position. These calibration lines are never printed.</div>}
        </section>
      </div>

      <div className="action-bar"><div><span className="status-dot" />{status}</div><div className="action-buttons"><button className="btn secondary" type="button" onClick={() => void save(false)} disabled={busy}>{busy ? "Working…" : "Save Draft"}</button><button className="btn" type="button" onClick={() => void save(true)} disabled={busy}>{busy ? "Working…" : "Save & Print"}</button></div></div>
      {error && <div className="designer-error">{error}</div>}
    </div>

    <section className="designer-stage">
      <div className="preview-heading"><div><div className="eyebrow">LIVE PREVIEW</div><h3>Print area</h3></div><span>Calibration guides are screen-only</span></div>
      <div ref={canvas} className="cheque-canvas" style={{ backgroundImage: bg ? `url(${bg})` : undefined }} onPointerMove={(e) => { move(e); moveLine(e); }} onPointerUp={() => { drag.current = null; lineDrag.current = null; }} onPointerCancel={() => { drag.current = null; lineDrag.current = null; }}>
        <div className={`cal-item ac ${sel === "acPayee" ? "selected" : ""}`} style={{ left: `${cfg.acPayee.x}mm`, top: `${cfg.acPayee.y}mm`, fontSize: `${cfg.acPayee.font}pt`, transform: `rotate(${cfg.acPayee.angle}deg)` }} onPointerDown={(e) => down(e, "acPayee")}><span className="line" style={{ top: `${cfg.acPayee.topLineY}mm`, width: `${cfg.acPayee.width}mm` }} onPointerDown={(e) => lineDown(e, "top")} /><span>A/C PAYEE</span><span className="line" style={{ top: `${cfg.acPayee.bottomLineY}mm`, width: `${cfg.acPayee.width}mm` }} onPointerDown={(e) => lineDown(e, "bottom")} /></div>
        <div className={`cal-item date ${sel === "date" ? "selected" : ""}`} style={itemStyle("date")} onPointerDown={(e) => down(e, "date")}>{datePreview}</div>
        <div className={`cal-item payee ${sel === "payee" ? "selected" : ""}`} style={itemStyle("payee")} onPointerDown={(e) => down(e, "payee")}>{payee}</div>
        <div className={`cal-item amount ${sel === "amount" ? "selected" : ""}`} style={itemStyle("amount")} onPointerDown={(e) => down(e, "amount")}>{formatIndianAmount(amount)}</div>
        <div className={`cal-item words1 ${sel === "words1" ? "selected" : ""}`} style={itemStyle("words1")} onPointerDown={(e) => down(e, "words1")}>{w1}</div>
        <div className={`cal-item words2 ${sel === "words2" ? "selected" : ""}`} style={itemStyle("words2")} onPointerDown={(e) => down(e, "words2")}>{w2}</div>
      </div>
    </section>
  </div>;
}
