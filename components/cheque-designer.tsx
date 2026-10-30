"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Key = "acPayee" | "acPayeeTopLine" | "acPayeeBottomLine" | "date" | "payee" | "amount" | "words1" | "words2";
type C = { x: number; y: number; font?: number; width?: number; angle?: number; spacing?: number; enabled?: boolean };
type Template = { id: string; name: string; payee: string; calibration: Record<Key, C> };
type Props = { initialDraft?: { id: string; chequeNumber?: string | number; payee: string; date: string; amount: string; notes: string; config?: Record<string, C> } };
type Drag = { k: Key; dx: number; dy: number };

const initial: Record<Key, C> = {
  acPayee: { x: 14, y: 12, font: 12, angle: -40, enabled: true },
  acPayeeTopLine: { x: 14, y: 9.7, width: 24, angle: -40, enabled: true },
  acPayeeBottomLine: { x: 14, y: 14.3, width: 24, angle: -40, enabled: true },
  date: { x: 154, y: 10, font: 12, spacing: 1.1, enabled: true },
  payee: { x: 30, y: 28, font: 12, width: 90, enabled: true },
  amount: { x: 154, y: 29, font: 12, width: 35, enabled: true },
  words1: { x: 30, y: 39, font: 11, width: 120, enabled: true },
  words2: { x: 30, y: 46, font: 11, width: 120, enabled: true },
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
  ctx.font = `${pt * 96 / 72}px Inter, system-ui, sans-serif`;
  return ctx.measureText(text).width;
}
function wrapTwoLines(s: string, w1: number, font1: number): [string, string] {
  if (!s) return ["", ""];
  const width1Px = Math.max(1, w1 * 96 / 25.4);
  const words = s.split(/\s+/).filter(Boolean);
  let line1 = ""; let index = 0;
  for (; index < words.length; index++) {
    const candidate = line1 ? `${line1} ${words[index]}` : words[index];
    if (measureText(candidate, font1) <= width1Px) line1 = candidate; else break;
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
  if (source.acPayee && typeof source.acPayee === "object") {
    const old = source.acPayee;
    out.acPayee = { ...out.acPayee, x: old.x ?? out.acPayee.x, y: old.y ?? out.acPayee.y, font: old.font ?? out.acPayee.font, angle: old.angle ?? out.acPayee.angle };
    if (!source.acPayeeTopLine || typeof source.acPayeeTopLine !== "object") out.acPayeeTopLine = { ...out.acPayeeTopLine, x: old.x ?? out.acPayeeTopLine.x, y: (old.y ?? out.acPayee.y) + (old.topLineY ?? -2.3), width: old.width ?? out.acPayeeTopLine.width, angle: old.angle ?? out.acPayeeTopLine.angle };
    if (!source.acPayeeBottomLine || typeof source.acPayeeBottomLine !== "object") out.acPayeeBottomLine = { ...out.acPayeeBottomLine, x: old.x ?? out.acPayeeBottomLine.x, y: (old.y ?? out.acPayee.y) + (old.bottomLineY ?? 2.3), width: old.width ?? out.acPayeeBottomLine.width, angle: old.angle ?? out.acPayeeBottomLine.angle };
  }
  return out;
}

const Toggle = ({ checked, onChange, label, note }: { checked: boolean; onChange: (v: boolean) => void; label: string; note: string }) => (
  <label className="cd-toggle-row">
    <span><strong>{label}</strong><small>{note}</small></span>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <i aria-hidden="true" />
  </label>
);

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
  // Post-print confirmation (shown after the print dialog closes; never part of the printed page).
  const [printedId, setPrintedId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [payeeOptions, setPayeeOptions] = useState<string[]>([]);
  const [confirmMsg, setConfirmMsg] = useState("");

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
  const loadPayees = async () => {
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return;
    const { data } = await s.from("payees").select("name").eq("user_id", user.id).eq("is_active", true).order("name");
    const seen = new Set<string>();
    setPayeeOptions((data || []).map((r: { name: string }) => r.name).filter((n: string) => { const k = n.trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }));
  };
  useEffect(() => { void loadTemplates(); void loadPayees(); }, []);
  useEffect(() => {
    if (initialDraft || typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("template");
    if (!id) return;
    const found = templates.find((t) => t.id === id);
    if (found) { setSelectedTemplate(found.id); setPayee(found.payee); setCfg(normalizeConfig(found.calibration)); setStatus(`Template loaded: ${found.name} ✓`); }
  }, [templates, initialDraft]);

  const chooseTemplate = (id: string) => {
    setSelectedTemplate(id);
    if (!id) { setStatus("Ready"); setCfg(normalizeConfig(initial)); return; }
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setCfg(normalizeConfig(t.calibration)); setPayee(t.payee); setStatus(`Template loaded: ${t.name} ✓`);
  };
  const field = (k: Key, f: keyof C, v: number | boolean) => setCfg((x) => ({ ...x, [k]: { ...x[k], [f]: v } }));
  const enabled = (k: Key) => cfg[k].enabled !== false;
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
      const layout = { version: 3, chequeWidthMm: 200, chequeHeightMm: 100, payee: payee.trim(), calibration: cfg };
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

  // Opens the browser print dialog, then asks whether the cheque really printed.
  // afterprint is not reliable on every mobile browser, so a short fallback timer also opens the question.
  const runPrint = () => {
    const ask = () => { setConfirmMsg(""); setConfirmOpen(true); };
    window.addEventListener("afterprint", ask, { once: true });
    window.print();
    window.setTimeout(ask, 1500);
  };
  const printAgain = () => { setConfirmOpen(false); window.setTimeout(runPrint, 200); };
  const confirmPrinted = () => { setConfirmOpen(false); router.push("/register"); };
  const markNotPrinted = async () => {
    if (!printedId) { setConfirmMsg("Could not find this cheque. Open it from the register."); return; }
    setConfirmBusy(true); setConfirmMsg("");
    try {
      const s = createClient(); const { data: { user } } = await s.auth.getUser(); if (!user) { router.push("/login"); return; }
      const h = await s.from("print_history").delete().eq("cheque_id", printedId).eq("user_id", user.id); if (h.error) throw h.error;
      const u = await s.from("cheques").update({ status: "draft", print_count: 0, first_printed_at: null, last_printed_at: null, updated_at: new Date().toISOString() }).eq("id", printedId).eq("user_id", user.id); if (u.error) throw u.error;
      setConfirmOpen(false); router.push(`/designer?edit=${printedId}`);
    } catch (e) { setConfirmMsg(e instanceof Error ? e.message : "Could not move the cheque back to draft."); }
    finally { setConfirmBusy(false); }
  };
  const cancelSpoiled = async () => {
    if (!printedId) { setConfirmMsg("Could not find this cheque. Open it from the register."); return; }
    if (!window.confirm("Cancel this cheque? Use this when the leaf was spoiled or printed wrongly. A cancelled cheque cannot be printed again.")) return;
    setConfirmBusy(true); setConfirmMsg("");
    try {
      const s = createClient(); const { data: { user } } = await s.auth.getUser(); if (!user) { router.push("/login"); return; }
      const u = await s.from("cheques").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", printedId).eq("user_id", user.id); if (u.error) throw u.error;
      setConfirmOpen(false); router.push(`/cheques/${printedId}`);
    } catch (e) { setConfirmMsg(e instanceof Error ? e.message : "Could not cancel the cheque."); }
    finally { setConfirmBusy(false); }
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
      const likeName = payee.trim().replace(/[\\%_]/g, (ch) => "\\" + ch);
      let { data: payeeRow, error: pe } = await s.from("payees").select("id").eq("user_id", user.id).ilike("name", likeName).order("is_active", { ascending: false }).limit(1).maybeSingle(); if (pe) throw pe;
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
        const { data: printedRow, error: pr } = await s.rpc("create_and_print_cheque", { p_cheque_number: normalizedChequeNumber, p_payee_id: payeeRow.id, p_cheque_date: isoDate(date), p_amount: +amount, p_amount_in_words: words, p_layout_snapshot: snap, p_notes: notes.trim(), p_draft_id: initialDraft?.id || null }); if (pr) throw pr;
        setPrintedId(String((printedRow as { id?: string } | null)?.id || ""));
      }
      setStatus(print ? "Saved ✓ — printing…" : "Draft saved ✓");
      if (print) runPrint();
    } catch (e) { setStatus("Unable to save"); setError(e instanceof Error ? e.message : "Unable to save cheque"); }
    finally { setBusy(false); }
  };

  const dateWarning = useMemo(() => {
    if (!validDate(date)) return "";
    const d = new Date(`${isoDate(date)}T00:00:00`); const now = new Date(); now.setHours(0, 0, 0, 0);
    const days = Math.round((d.getTime() - now.getTime()) / 86400000);
    if (days < -90) return "This date is more than 3 months in the past. Banks treat such a cheque as stale — check the date.";
    if (days > 120) return "This date is far in the future. Check the year before you print.";
    return "";
  }, [date]);

  const c = cfg[sel];
  const itemStyle = (k: Key): React.CSSProperties => ({ left: `${cfg[k].x}mm`, top: `${cfg[k].y}mm`, fontSize: cfg[k].font ? `${cfg[k].font}pt` : undefined, width: cfg[k].width ? `${cfg[k].width}mm` : undefined, transform: cfg[k].angle != null ? `rotate(${cfg[k].angle}deg)` : undefined });
  const dateDigits = date.split("");

  return <div className="cd-page">
    <style>{`
      .cd-page{min-height:calc(100vh - 64px);padding:28px 20px 56px;background:radial-gradient(circle at 15% 0%,rgba(16,185,129,.06),transparent 30%),linear-gradient(180deg,#f8faf9 0%,#eef3f1 100%);color:#172033}
      .cd-shell{max-width:1320px;margin:0 auto}
      .cd-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:20px}
      .cd-kicker{font-size:10px;letter-spacing:1.6px;font-weight:850;color:#16806b;text-transform:uppercase;margin-bottom:5px}
      .cd-header h1{margin:0;font-size:32px;line-height:1.08;letter-spacing:-1px;color:#10201c}
      .cd-header p{margin:7px 0 0;color:#66756f;font-size:14px;max-width:620px}
      .cd-size{display:inline-flex;align-items:center;gap:8px;border:1px solid #d8e5e0;background:rgba(255,255,255,.82);border-radius:999px;padding:9px 13px;font-size:12px;font-weight:800;color:#31564d;white-space:nowrap;box-shadow:0 5px 18px rgba(16,24,40,.05)}
      .cd-size i{width:7px;height:7px;border-radius:50%;background:#14b889;display:block}
      .cd-layout{display:grid;grid-template-columns:370px minmax(0,1fr);gap:22px;align-items:start}
      .cd-panel,.cd-stage{border:1px solid #dfe8e4;background:rgba(255,255,255,.88);border-radius:20px;box-shadow:0 16px 45px rgba(16,24,40,.07)}
      .cd-panel{padding:15px;display:grid;gap:11px}
      .cd-intro{display:flex;gap:11px;align-items:center;padding:4px 4px 8px}
      .cd-icon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:#e3f7f1;color:#12866e;font-weight:900;box-shadow:inset 0 0 0 1px #cceee5}
      .cd-intro h2{margin:0;font-size:16px;letter-spacing:-.2px}.cd-intro p{margin:2px 0 0;font-size:11px;color:#7b8984}
      .cd-card{background:#fff;border:1px solid #e4ebe8;border-radius:15px;padding:14px;display:grid;gap:10px}
      .cd-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.cd-card-head strong{font-size:12px;color:#22352f}.cd-card-head span{font-size:10px;color:#9aa7a2}
      .cd-panel label{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:800;color:#344840}.cd-panel input,.cd-panel select{width:100%;min-height:38px;padding:9px 10px;border:1px solid #ccd9d4;border-radius:9px;background:#fff;color:#10201c;font-size:13px;outline:none;transition:.16s ease}.cd-panel input:focus,.cd-panel select:focus{border-color:#48b89e;box-shadow:0 0 0 3px rgba(20,184,137,.11)}
      .cd-helper{font-size:10.5px;line-height:1.45;color:#687873;background:#f7faf9;border:1px solid #edf2f0;border-radius:9px;padding:8px 9px}
      .cd-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cd-btn{border:1px solid transparent;border-radius:10px;min-height:40px;padding:9px 12px;font-size:11px;font-weight:850;cursor:pointer}.cd-btn-primary{background:linear-gradient(135deg,#16b889,#0e9e7c);color:#fff;box-shadow:0 7px 18px rgba(14,158,124,.18)}.cd-btn-secondary{background:#eaf8f4;color:#137b65;border-color:#d7eee8}.cd-btn-ghost{background:#fff;color:#43544f;border-color:#d4dfdb}.cd-btn:disabled{opacity:.55;cursor:not-allowed}
      .cd-toggle-card{background:linear-gradient(180deg,#fbfffd,#f6fbf9)}
      .cd-toggle-row{position:relative!important;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;padding:10px 0;border-top:1px solid #edf2f0;font-size:11px!important;cursor:pointer}.cd-toggle-row:first-of-type{border-top:0;padding-top:2px}.cd-toggle-row span{display:grid;gap:2px}.cd-toggle-row strong{font-size:11px;color:#22352f}.cd-toggle-row small{font-size:9.5px;font-weight:550;color:#8a9792}.cd-toggle-row input{position:absolute!important;opacity:0!important;pointer-events:none!important}.cd-toggle-row i{position:relative;flex:0 0 38px;width:38px;height:22px;border-radius:999px;background:#d8e2de;box-shadow:inset 0 0 0 1px #c8d4cf;transition:.18s}.cd-toggle-row i:after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 2px 5px rgba(16,24,40,.16);transition:.18s}.cd-toggle-row input:checked+i{background:#14b889;box-shadow:none}.cd-toggle-row input:checked+i:after{transform:translateX(16px)}
      .cd-cal-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cd-status{display:flex;align-items:center;justify-content:center;gap:7px;min-height:32px;border-radius:10px;background:#e9f9f4;color:#137b65;font-size:11px;font-weight:800}.cd-status i{width:6px;height:6px;border-radius:50%;background:#14b889}.cd-error{background:#fff1f0;color:#b42318;border:1px solid #fecdca;border-radius:9px;padding:8px 10px;font-size:11px}
      .cd-stage{padding:17px;min-width:0;overflow:hidden}.cd-stage-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:13px}.cd-stage-head strong{display:block;font-size:13px;color:#22352f}.cd-stage-head span{display:block;margin-top:2px;font-size:10px;color:#89958f}.cd-preview-pill{padding:6px 9px;border:1px solid #dfe8e4;border-radius:8px;background:#fff;font-size:10px!important;font-weight:800!important;color:#61706a!important;white-space:nowrap}
      .cd-preview-wrap{display:flex;justify-content:center;align-items:flex-start;overflow:auto;padding:18px 10px 24px;border-radius:15px;background:linear-gradient(135deg,#f3f8f6,#edf3f0);border:1px solid #e5ece9;min-height:calc(100vh - 240px)}
      .cheque-canvas{flex:0 0 auto;box-shadow:0 18px 48px rgba(16,24,40,.16)!important;border-color:#d3dfda!important}
      .cd-preview-note{text-align:center;font-size:10px;color:#87948e;margin-top:10px}
      .cd-page .cal-item:hover,.cd-page .cal-item.selected{outline:1px dashed #15a985!important;outline-offset:3px}
      @media(max-width:1100px){.cd-layout{grid-template-columns:340px minmax(0,1fr)}.cd-header h1{font-size:29px}}
      @media(max-width:900px){.cd-page{padding:20px 12px 42px}.cd-header{align-items:flex-start}.cd-size{display:none}.cd-layout{grid-template-columns:1fr;gap:16px}.cd-panel{order:1}.cd-stage{order:2}.cd-preview-wrap{min-height:0;justify-content:flex-start}.cd-stage{overflow:visible}}
      @media(max-width:560px){.cd-page{padding:16px 9px 36px}.cd-header{margin-bottom:14px}.cd-header h1{font-size:25px}.cd-header p{font-size:13px;line-height:1.5}.cd-panel,.cd-stage{border-radius:16px}.cd-panel{padding:11px}.cd-card{padding:12px}.cd-stage{padding:12px}.cd-preview-wrap{padding:12px 5px 18px}.cd-actions{grid-template-columns:1fr}.cd-stage-head{align-items:flex-start}.cd-preview-pill{display:none}}
    `}</style>

    <div className="cd-shell">
      <header className="cd-header">
        <div><div className="cd-kicker">Cheque printing workspace</div><h1>Design your cheque once. Print it right.</h1><p>Enter the cheque details, calibrate each printed field precisely, and save the layout as a reusable template.</p></div>
        <div className="cd-size"><i /> Physical cheque · 200 × 100 mm</div>
      </header>

      <div className="cd-layout">
        <aside className="cd-panel">
          <div className="cd-intro"><div className="cd-icon">✓</div><div><h2>Designer controls</h2><p>Details, reusable layouts and print calibration.</p></div></div>

          <div className="cd-card">
            <div className="cd-card-head"><strong>Template</strong><span>Reuse calibration</span></div>
            <label>Choose template<select value={selectedTemplate} onChange={(e) => chooseTemplate(e.target.value)} disabled={busy}><option value="">Blank / no template</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.payee ? ` — ${t.payee}` : ""}</option>)}</select></label>
            <label>Template name<input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. SBI Current Account" disabled={busy} /></label>
            <div className="cd-actions"><button className="cd-btn cd-btn-secondary" type="button" onClick={() => void saveTemplate(false)} disabled={busy}>Save as template</button>{selectedTemplate && <button className="cd-btn cd-btn-ghost" type="button" onClick={() => void saveTemplate(true)} disabled={busy}>Update</button>}</div>
          </div>

          <div className="cd-card">
            <div className="cd-card-head"><strong>Cheque details</strong><span>Stored securely</span></div>
            <label>Actual cheque number<input inputMode="numeric" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value.replace(/\D/g, "").slice(0, 18))} placeholder="e.g. 002536" disabled={busy} /></label>
            <div className="cd-helper">The physical cheque number identifies the cheque in your register. It is never rendered or printed by this designer.</div>
            <label>Payee<input value={payee} onChange={(e) => setPayee(e.target.value)} disabled={busy} placeholder="Payee name" list="pf-payee-list" autoComplete="off" /><datalist id="pf-payee-list">{payeeOptions.map((n) => <option key={n} value={n} />)}</datalist></label>
            <div className="cd-cal-grid"><label>Date <span className="label-hint">DDMMYYYY</span><input inputMode="numeric" value={date} onChange={(e) => setDate(e.target.value.replace(/\D/g, "").slice(0, 8))} disabled={busy} placeholder="28082026" /></label><label>Amount<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))} disabled={busy} placeholder="0.00" /></label></div>
            {dateWarning && <div className="cd-helper cd-warn" role="status">{dateWarning}</div>}
            <label>Notes<input className="notes-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" disabled={busy} /></label>
            <label className="upload">Calibration background<input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; setBg(f ? URL.createObjectURL(f) : null); }} disabled={busy} /><span>Upload the original cheque image for on-screen alignment.</span></label>
          </div>

          <div className="cd-card cd-toggle-card">
            <div className="cd-card-head"><strong>Cheque crossing</strong><span>Optional for non A/C Payee cheques</span></div>
            <Toggle checked={enabled("acPayee")} onChange={(v) => field("acPayee", "enabled", v)} label="A/C PAYEE text" note="Print the A/C PAYEE wording" />
            <Toggle checked={enabled("acPayeeTopLine")} onChange={(v) => field("acPayeeTopLine", "enabled", v)} label="A/C PAYEE top line" note="Print the upper crossing line" />
            <Toggle checked={enabled("acPayeeBottomLine")} onChange={(v) => field("acPayeeBottomLine", "enabled", v)} label="A/C PAYEE bottom line" note="Print the lower crossing line" />
          </div>

          <div className="cd-card">
            <div className="cd-card-head"><strong>Field calibration</strong><span>Drag or edit values</span></div>
            <label>Field<select value={sel} onChange={(e) => setSel(e.target.value as Key)}><option value="acPayee">A/C PAYEE text</option><option value="acPayeeTopLine">A/C PAYEE — top line</option><option value="acPayeeBottomLine">A/C PAYEE — bottom line</option><option value="date">Date digits</option><option value="payee">Payee</option><option value="amount">Numeric amount</option><option value="words1">Amount in words — line 1</option><option value="words2">Amount in words — line 2</option></select></label>
            <div className="cd-cal-grid"><label>X<input type="number" step="0.1" value={c.x} onChange={(e) => field(sel, "x", +e.target.value)} /></label><label>Y<input type="number" step="0.1" value={c.y} onChange={(e) => field(sel, "y", +e.target.value)} /></label></div>
            {c.font != null && <label>Font size <span className="label-hint">pt</span><input type="number" step="0.5" value={c.font} onChange={(e) => field(sel, "font", +e.target.value)} /></label>}
            {c.width != null && <label>Width <span className="label-hint">mm</span><input type="number" step="0.1" value={c.width} onChange={(e) => field(sel, "width", +e.target.value)} /></label>}
            {(c.angle != null || sel === "acPayee" || sel === "acPayeeTopLine" || sel === "acPayeeBottomLine") && <label>Angle <span className="label-hint">degrees</span><input type="number" step="1" value={c.angle ?? 0} onChange={(e) => field(sel, "angle", +e.target.value)} /></label>}
            {sel === "date" && <label>Digit spacing <span className="label-hint">mm</span><input type="number" step="0.1" value={c.spacing ?? 0} onChange={(e) => field(sel, "spacing", +e.target.value)} /></label>}
            {(sel === "acPayeeTopLine" || sel === "acPayeeBottomLine") && <div className="cd-helper">Each crossing line is calibrated independently, so you can match different cheque books precisely.</div>}
          </div>

          <div className="cd-actions"><button className="cd-btn cd-btn-secondary" type="button" onClick={() => void save(false)} disabled={busy}>Save draft</button><button className="cd-btn cd-btn-primary" type="button" onClick={() => void save(true)} disabled={busy}>Save &amp; print</button></div>
          {error && <div className="cd-error">{error}</div>}
          <div className="cd-status"><i />{status}</div>
        </aside>

        <section className="cd-stage">
          <div className="cd-stage-head"><div><strong>Live cheque preview</strong><span>Drag a field on the cheque or use the calibration controls.</span></div><span className="cd-preview-pill">200 × 100 mm</span></div>
          <div className="cd-preview-wrap">
            <div ref={canvas} className="cheque-canvas" style={{ backgroundImage: bg ? `url(${bg})` : undefined }} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
              {enabled("acPayee") && <div className={`cal-item ac-text ${sel === "acPayee" ? "selected" : ""}`} style={itemStyle("acPayee")} onPointerDown={(e) => down(e, "acPayee")}>A/C PAYEE</div>}
              {enabled("acPayeeTopLine") && <div className={`cal-item ac-line ac-top-line ${sel === "acPayeeTopLine" ? "selected" : ""}`} style={itemStyle("acPayeeTopLine")} onPointerDown={(e) => down(e, "acPayeeTopLine")} />}
              {enabled("acPayeeBottomLine") && <div className={`cal-item ac-line ac-bottom-line ${sel === "acPayeeBottomLine" ? "selected" : ""}`} style={itemStyle("acPayeeBottomLine")} onPointerDown={(e) => down(e, "acPayeeBottomLine")} />}
              <div className={`cal-item date ${sel === "date" ? "selected" : ""}`} style={itemStyle("date")} onPointerDown={(e) => down(e, "date")}>{dateDigits.map((d, i) => <span key={`${i}-${d}`} style={{ marginRight: i === dateDigits.length - 1 ? 0 : `${cfg.date.spacing ?? 0.8}mm` }}>{d}</span>)}</div>
              <div className={`cal-item payee ${sel === "payee" ? "selected" : ""}`} style={itemStyle("payee")} onPointerDown={(e) => down(e, "payee")}>{payee}</div>
              <div className={`cal-item amount ${sel === "amount" ? "selected" : ""}`} style={itemStyle("amount")} onPointerDown={(e) => down(e, "amount")}>{formatIndianAmount(amount)}</div>
              <div className={`cal-item words1 ${sel === "words1" ? "selected" : ""}`} style={itemStyle("words1")} onPointerDown={(e) => down(e, "words1")}>{w1}</div>
              <div className={`cal-item words2 ${sel === "words2" ? "selected" : ""}`} style={itemStyle("words2")} onPointerDown={(e) => down(e, "words2")}>{w2}</div>
            </div>
          </div>
          <div className="cd-preview-note">The cheque remains a true 200 × 100 mm calibration surface. Screen scaling does not change stored millimetre positions.</div>
        </section>
      </div>
    </div>
    {confirmOpen && <div className="pf-confirm" role="dialog" aria-modal="true" aria-labelledby="pf-confirm-title">
      <style>{`.pf-confirm{position:fixed;inset:0;z-index:2000;display:grid;place-items:center;padding:20px;background:rgba(10,26,22,.55);backdrop-filter:blur(3px)}.pf-confirm-card{width:min(440px,100%);background:#fff;border:1px solid #e2e8e5;border-radius:22px;padding:26px 22px 20px;box-shadow:0 24px 64px rgba(10,26,22,.3);text-align:center}.pf-confirm-card h2{margin:6px 0 6px;font-size:22px;color:#0a1a16}.pf-confirm-card p{margin:0 0 18px;color:#6b7873;font-size:14px;line-height:1.55}.pf-confirm-kicker{font-size:11px;font-weight:700;letter-spacing:.16em;color:#b8975a}.pf-confirm-actions{display:grid;gap:10px}.pf-confirm-actions button{min-height:46px;border-radius:12px;font-weight:650;font-size:14px;cursor:pointer;border:1px solid #d9e1dd;background:#fff;color:#0a1a16}.pf-confirm-actions button.pf-yes{background:linear-gradient(180deg,#12b58f,#0b8a6c);border-color:#0b8a6c;color:#fff}.pf-confirm-actions button.pf-warn{border-color:#f0d6d2;color:#a8362c}.pf-confirm-actions button:disabled{opacity:.6;cursor:wait}.pf-confirm-msg{margin-top:12px;color:#a8362c;font-size:13px}@media print{.pf-confirm{display:none!important}}`}</style>
      <div className="pf-confirm-card">
        <div className="pf-confirm-kicker">PRINT CHECK</div>
        <h2 id="pf-confirm-title">Did the cheque print correctly?</h2>
        <p>Your register only shows what really happened. Cheque {chequeNumber.trim()} for ₹{formatIndianAmount(amount)} to {payee.trim() || "payee"}.</p>
        <div className="pf-confirm-actions">
          <button type="button" className="pf-yes" autoFocus onClick={confirmPrinted} disabled={confirmBusy}>Yes, it printed correctly</button>
          <button type="button" onClick={printAgain} disabled={confirmBusy}>Print again</button>
          <button type="button" onClick={() => void markNotPrinted()} disabled={confirmBusy}>It didn’t print — move back to draft</button>
          <button type="button" className="pf-warn" onClick={() => void cancelSpoiled()} disabled={confirmBusy}>Printed wrongly — cancel this cheque</button>
        </div>
        {confirmMsg && <div className="pf-confirm-msg" role="alert">{confirmMsg}</div>}
      </div>
    </div>}
  </div>;
}
