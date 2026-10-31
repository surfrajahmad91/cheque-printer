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

const FIELD_LABELS: Record<Key, string> = { acPayee: "A/C PAYEE text", acPayeeTopLine: "A/C PAYEE top line", acPayeeBottomLine: "A/C PAYEE bottom line", date: "Date digits", payee: "Payee", amount: "Numeric amount", words1: "Amount in words · line 1", words2: "Amount in words · line 2" };
const FIELD_CHIPS: { k: Key; t: string }[] = [{ k: "payee", t: "Payee" }, { k: "date", t: "Date" }, { k: "amount", t: "Amount" }, { k: "words1", t: "Words 1" }, { k: "words2", t: "Words 2" }, { k: "acPayee", t: "A/C text" }, { k: "acPayeeTopLine", t: "Top line" }, { k: "acPayeeBottomLine", t: "Bottom line" }];
const r1 = (n: number) => Math.round(n * 10) / 10;

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
  const [attempted, setAttempted] = useState(false);
  const [showRulers, setShowRulers] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [nudge, setNudge] = useState(0.5);
  const [box, setBox] = useState({ l: 0, t: 0, w: 0, h: 0 });
  const prevSel = useRef<Key>("payee");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

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

  const numOk = /^\d+$/.test(chequeNumber.trim()) && /[1-9]/.test(chequeNumber);
  const payeeOk = !!payee.trim();
  const dateOk = validDate(date);
  const amtOk = /^(?:\d+)(?:\.\d{1,2})?$/.test(amount) && +amount > 0;
  const checks = [{ id: "pf-num", label: "Cheque no.", ok: numOk }, { id: "pf-payee", label: "Payee", ok: payeeOk }, { id: "pf-date", label: "Date", ok: dateOk }, { id: "pf-amount", label: "Amount", ok: amtOk }];
  const doneCount = checks.filter((x) => x.ok).length;
  const fstate = (ok: boolean, filled: boolean) => (ok ? "ok" : attempted || filled ? "bad" : "todo");
  const dateLabel = useMemo(() => (validDate(date) ? new Date(`${isoDate(date)}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : ""), [date]);
  const typed = payee.trim().toLowerCase();
  const suggestions = payeeOptions.filter((n) => n.toLowerCase() !== typed && (!typed || n.toLowerCase().includes(typed))).slice(0, 5);
  const fillToday = () => { const d = new Date(); const pad = (n: number) => String(n).padStart(2, "0"); setDate(`${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}`); };
  const enterTo = (id: string) => (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); document.getElementById(id)?.focus(); } };
  const goTo = (id: string) => { const el = document.getElementById(id); el?.scrollIntoView({ behavior: "smooth", block: "center" }); window.setTimeout(() => el?.focus({ preventScroll: true }), 350); };
  const trySave = (print: boolean) => {
    setAttempted(true);
    const missing = checks.filter((x) => !x.ok);
    if (missing.length) { setError(""); setStatus(`Please complete: ${missing.map((x) => x.label).join(", ")}`); goTo(missing[0].id); return; }
    void save(print);
  };
  // Fit the 200 × 100 mm surface to the available width (screen only; print forces zoom:1) and measure it for the rulers.
  useEffect(() => {
    const el = canvas.current; const wrap = wrapRef.current; if (!el || !wrap) return;
    const update = () => {
      const cs = getComputedStyle(wrap);
      const avail = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const z = Math.max(0.2, Math.min(1, avail / (200 * 96 / 25.4)));
      setZoom((prev) => (Math.abs(prev - z) < 0.002 ? prev : z));
      const wr = wrap.getBoundingClientRect(); const cr = el.getBoundingClientRect();
      setBox({ l: cr.left - wr.left - wrap.clientLeft + wrap.scrollLeft, t: cr.top - wr.top - wrap.clientTop + wrap.scrollTop, w: cr.width, h: cr.height });
    };
    update();
    const ro = new ResizeObserver(update); ro.observe(wrap); ro.observe(el);
    window.addEventListener("resize", update);
    return () => { ro.disconnect(); window.removeEventListener("resize", update); };
  }, []);
  useEffect(() => { if (prevSel.current !== sel) { prevSel.current = sel; setCalOpen(true); } }, [sel]);

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
    <style>{`
      @media print{.pf-chrome,.pf-progress,.pf-actionbar,.pf-tools{display:none!important}}
      @media screen{
        /* Desktop: controls on the left, a sticky live preview on the right. */
        @media (min-width:1100px){
          html body .designer-page-layout .cd-layout{grid-template-columns:minmax(380px,430px) minmax(0,1fr)!important;align-items:start!important;gap:24px!important}
          html body .designer-page-layout .cd-panel{order:1!important}
          html body .designer-page-layout .cd-stage{order:2!important;position:sticky;top:84px;align-self:start}
        }
        html body .designer-page-layout .cd-preview-wrap{position:relative!important;padding:66px 28px 32px 66px!important;background:radial-gradient(circle at 1px 1px,rgba(10,26,22,.075) 1px,transparent 0) 0 0/18px 18px,linear-gradient(135deg,#f4f7f5,#e8eeea)!important;border:1px solid #dfe7e3!important;border-radius:18px!important}
        html body .designer-page-layout .cheque-canvas{width:200mm!important;min-width:200mm!important;max-width:none!important;height:auto!important;aspect-ratio:2 / 1!important;zoom:var(--pf-zoom,1)!important;background-color:#fffefa!important;border-radius:3px;box-shadow:0 0 0 1px rgba(10,26,22,.10),0 2px 4px rgba(10,26,22,.10),0 26px 60px rgba(10,26,22,.24)!important}
        @media (max-width:560px){html body .designer-page-layout .cd-preview-wrap{padding:58px 12px 24px 50px!important}}

        .pf-chrome{position:absolute;pointer-events:none;z-index:5}
        .pf-dim-h{height:18px;display:flex;align-items:center}
        .pf-dim-h i{position:absolute;left:0;right:0;top:50%;height:1px;background:#4f6a61}
        .pf-dim-h i::before,.pf-dim-h i::after{content:"";position:absolute;top:-4px;width:1px;height:9px;background:#4f6a61}
        .pf-dim-h i::before{left:0}.pf-dim-h i::after{right:0}
        .pf-dim-h span{position:relative;margin:0 auto}
        .pf-dim-v{width:18px;display:flex;align-items:center;justify-content:center}
        .pf-dim-v i{position:absolute;top:0;bottom:0;left:50%;width:1px;background:#4f6a61}
        .pf-dim-v i::before,.pf-dim-v i::after{content:"";position:absolute;left:-4px;width:9px;height:1px;background:#4f6a61}
        .pf-dim-v i::before{top:0}.pf-dim-v i::after{bottom:0}
        .pf-dim-v span{position:relative;writing-mode:vertical-rl;transform:rotate(180deg)}
        .pf-dim span{background:#eef3f0;border:1px solid #cbd8d2;border-radius:99px;padding:2px 10px;font-size:11px;font-weight:800;color:#24463b;white-space:nowrap}
        .pf-dim-v span{padding:10px 2px}
        .pf-dim span small{font-weight:600;color:#7c8c86;margin-left:4px}
        .pf-ruler{font-size:9px;font-weight:700;color:#5f7169}
        .pf-ruler b{position:absolute;font-weight:700}
        .pf-ruler-h{height:18px;background:repeating-linear-gradient(90deg,#a9b9b2 0 1px,transparent 1px calc(var(--pf-mm)*5)) bottom/100% 4px no-repeat,repeating-linear-gradient(90deg,#6f827a 0 1px,transparent 1px calc(var(--pf-mm)*10)) bottom/100% 8px no-repeat}
        .pf-ruler-h b{top:0;transform:translateX(-50%)}
        .pf-ruler-v{width:18px;background:repeating-linear-gradient(180deg,#a9b9b2 0 1px,transparent 1px calc(var(--pf-mm)*5)) right/4px 100% no-repeat,repeating-linear-gradient(180deg,#6f827a 0 1px,transparent 1px calc(var(--pf-mm)*10)) right/8px 100% no-repeat}
        .pf-ruler-v b{right:10px;transform:translateY(-50%)}
        .pf-grid{z-index:6;background-image:linear-gradient(rgba(11,138,108,.24) 1px,transparent 1px),linear-gradient(90deg,rgba(11,138,108,.24) 1px,transparent 1px),linear-gradient(rgba(11,138,108,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(11,138,108,.10) 1px,transparent 1px);background-size:calc(var(--pf-mm)*10) calc(var(--pf-mm)*10),calc(var(--pf-mm)*10) calc(var(--pf-mm)*10),calc(var(--pf-mm)*5) calc(var(--pf-mm)*5),calc(var(--pf-mm)*5) calc(var(--pf-mm)*5)}
        .pf-guides{z-index:7;overflow:hidden}
        .pf-guides i{position:absolute;display:block}
        .pf-guides i.v{top:0;bottom:0;border-left:1px dashed #d4762a}
        .pf-guides i.h{left:0;right:0;border-top:1px dashed #d4762a}
        .pf-guides em{position:absolute;transform:translate(8px,-26px);font-style:normal;font-size:10px;font-weight:800;color:#fff;background:#d4762a;padding:2px 7px;border-radius:6px;white-space:nowrap}
        .pf-crop{width:10px;height:10px;border:0 solid #4f6a61}
        .pf-crop.tl{border-right-width:1px;border-bottom-width:1px}.pf-crop.tr{border-left-width:1px;border-bottom-width:1px}
        .pf-crop.bl{border-right-width:1px;border-top-width:1px}.pf-crop.br{border-left-width:1px;border-top-width:1px}

        .pf-progress{background:linear-gradient(135deg,#0f2a22,#15392d);color:#fff;border-radius:16px;padding:14px 16px;display:grid;gap:10px;box-shadow:0 10px 26px rgba(10,26,22,.18)}
        .pf-progress-top{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
        .pf-progress-top strong{font-size:15px;letter-spacing:-.01em}.pf-progress-top span{font-size:11px;color:#b3d4c8}
        .pf-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.14);overflow:hidden}
        .pf-bar i{display:block;height:100%;background:linear-gradient(90deg,#12b58f,#7be0c4);transition:width .3s ease}
        .pf-steps{display:flex;gap:6px;flex-wrap:wrap}
        .pf-steps button{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.25);background:transparent;color:#d6ece3;border-radius:99px;padding:5px 10px 5px 6px;font-size:11px;font-weight:700;cursor:pointer}
        .pf-steps button i{width:15px;height:15px;border-radius:50%;border:1.5px solid rgba(255,255,255,.4);display:grid;place-items:center;font-size:9px;font-style:normal}
        .pf-steps button.ok{background:rgba(18,181,143,.22);border-color:#12b58f;color:#fff}.pf-steps button.ok i{background:#12b58f;border-color:#12b58f}

        .pf-jump{display:none!important;background:#fff!important;color:#0f2a22!important;border-color:#fff!important}
        @media (max-width:1099px){.pf-jump{display:inline-flex!important}}
        .pf-num{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#0f2a22;color:#fff;font-size:10px;margin-right:7px}
        .pf-f .pf-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
        .pf-req{font-size:10px;font-weight:800;padding:2px 8px;border-radius:99px;background:#fff1d6;color:#8a5a00;letter-spacing:.02em;white-space:nowrap}
        .pf-f.ok .pf-req{background:#dff5ec;color:#0b7a5e}.pf-f.bad .pf-req{background:#fde7e4;color:#a8362c}
        .pf-msg{font-size:11px;font-weight:500;color:#6b7873;line-height:1.45}.pf-f.bad .pf-msg{color:#a8362c}
        html body .cd-page .pf-f.todo input{border-color:#e8c777!important;background:#fffcf3!important;box-shadow:inset 3px 0 0 #e0a92b!important}
        html body .cd-page .pf-f.ok input{border-color:#7fd1b5!important;background:#f6fcf9!important;box-shadow:inset 3px 0 0 #12b58f!important}
        html body .cd-page .pf-f.bad input{border-color:#e48a80!important;background:#fff8f7!important;box-shadow:inset 3px 0 0 #d9534a!important;animation:pfshake .28s}
        @keyframes pfshake{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
        .pf-input{position:relative;display:block}.pf-input b{position:absolute;left:11px;top:50%;transform:translateY(-50%);font-weight:700;color:#6b7873;z-index:1}.pf-input input{padding-left:26px!important}
        .pf-link{background:none;border:0;padding:0;margin-left:4px;color:#0b8a6c;font-weight:700;font-size:11px;cursor:pointer;text-decoration:underline}
        .pf-words{background:#f6faf8;border:1px dashed #bcd8cd;border-radius:11px;padding:9px 11px;font-size:12px;font-weight:650;color:#1f4a3d;line-height:1.5}
        .pf-words small{display:block;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:#7c9a8f;font-weight:800;margin-bottom:2px}
        .pf-chips{display:flex;flex-wrap:wrap;gap:6px}
        .pf-chips button,.pf-step button{border:1px solid #d5e2dc;background:#fff;color:#2c4a40;border-radius:99px;padding:6px 11px;font-size:12px;font-weight:650;cursor:pointer}
        .pf-chips button:hover,.pf-step button:hover{border-color:#12b58f;background:#f2fbf8}
        .pf-chips button.on,.pf-step button.on{background:#0f2a22;color:#fff;border-color:#0f2a22}
        .pf-more>summary{cursor:pointer;font-size:12px;font-weight:700;color:#0b8a6c;list-style:none;padding:2px 0}.pf-more>summary::-webkit-details-marker{display:none}
        .pf-more[open]>summary{margin-bottom:8px}.pf-more{display:grid;gap:8px}
        .pf-cal>summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;font-weight:800;color:#22352f}
        .pf-cal>summary::-webkit-details-marker{display:none}
        .pf-cal>summary span{display:grid;gap:3px}.pf-cal>summary em{font-style:normal;font-weight:600;font-size:11px;color:#7b8984;margin-left:25px}
        .pf-cal>summary i{transition:transform .2s;font-style:normal;font-size:16px;color:#7b8984}.pf-cal[open]>summary i{transform:rotate(180deg)}
        .pf-cal-body{display:grid;gap:10px;margin-top:10px}
        .pf-nudge{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
        .pf-pad{display:grid;grid-template-columns:repeat(3,40px);grid-template-areas:". up ." "left . right" ". down .";gap:4px}
        .pf-pad button{width:40px;height:40px;border-radius:11px;border:1px solid #cfdcd6;background:#fff;color:#1f4a3d;font-size:13px;cursor:pointer}
        .pf-pad button:nth-child(1){grid-area:up}.pf-pad button:nth-child(2){grid-area:left}.pf-pad button:nth-child(3){grid-area:right}.pf-pad button:nth-child(4){grid-area:down}
        .pf-pad button:active{background:#e3f6ee;border-color:#12b58f}
        .pf-step{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.pf-step small{width:100%;font-size:10px;font-weight:800;color:#7c8c86;text-transform:uppercase;letter-spacing:.08em}

        .pf-actionbar{position:sticky;bottom:10px;z-index:30;display:grid;gap:8px;padding:10px;background:rgba(255,255,255,.94);backdrop-filter:blur(8px);border:1px solid #dbe6e1;border-radius:16px;box-shadow:0 14px 40px rgba(10,26,22,.16)}
        .pf-actionbar .cd-actions{grid-template-columns:1fr 1.4fr!important}.pf-actionbar .cd-btn{min-height:46px;font-size:13px;border-radius:12px}
        .pf-hint{font-size:11px;font-weight:600;color:#8a5a00;background:#fff6df;border-radius:9px;padding:7px 10px;line-height:1.45}
        .cd-btn.pf-incomplete{filter:saturate(.65)}

        .pf-tools{display:flex;gap:6px;flex-wrap:wrap}
        .pf-tools button{border:1px solid #d5e2dc;background:#fff;color:#4a5f57;border-radius:99px;padding:6px 11px;font-size:11px;font-weight:700;cursor:pointer}
        .pf-tools button.on{background:#0f2a22;color:#fff;border-color:#0f2a22}
        .pf-scale{position:static!important;pointer-events:auto;display:flex;justify-content:space-between;gap:6px 14px;flex-wrap:wrap;margin-top:10px;font-size:11px;color:#6b7873}.pf-scale b{color:#0f2a22}
        .pf-printcheck{position:static!important;pointer-events:auto;margin-top:12px;border:1px solid #e4ece8;background:#fbfdfc;border-radius:14px;padding:12px 14px}
        .pf-printcheck strong{font-size:12px;color:#10201c}
        .pf-printcheck ul{display:flex;gap:6px 18px;flex-wrap:wrap;margin:7px 0;padding:0;list-style:none;font-size:12px;font-weight:600;color:#1f4a3d}
        .pf-printcheck li::before{content:"✓ ";color:#12b58f;font-weight:900}
        .pf-printcheck p{margin:4px 0 0;font-size:11px;color:#7b8984;line-height:1.5}
      }
    `}</style>

    <div className="cd-shell">
      <header className="cd-header">
        <div><div className="cd-kicker">Cheque printing workspace</div><h1>Design your cheque once. Print it right.</h1><p>Enter the cheque details, calibrate each printed field precisely, and save the layout as a reusable template.</p></div>
        <div className="cd-size"><i /> Physical cheque · 200 × 100 mm</div>
      </header>

      <div className="cd-layout">
        <aside className="cd-panel">
          <div className="pf-progress" aria-live="polite">
            <div className="pf-progress-top"><strong>{doneCount === 4 ? "Ready to print" : `${doneCount} of 4 required details`}</strong><span>{doneCount === 4 ? "Everything looks good" : "Fill the highlighted fields"}</span></div>
            <div className="pf-bar"><i style={{ width: `${doneCount * 25}%` }} /></div>
            <div className="pf-steps"><button type="button" className="pf-jump" onClick={() => document.querySelector(".cd-stage")?.scrollIntoView({ behavior: "smooth", block: "start" })}>See preview ↓</button>{checks.map((x) => <button key={x.id} type="button" className={x.ok ? "ok" : ""} onClick={() => goTo(x.id)}><i>{x.ok ? "✓" : ""}</i>{x.label}</button>)}</div>
          </div>

          <div className="cd-card pf-template">
            <div className="cd-card-head"><strong>Quick start</strong><span>Optional</span></div>
            <label>Start from a saved template<select value={selectedTemplate} onChange={(e) => chooseTemplate(e.target.value)} disabled={busy}><option value="">Blank / no template</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.payee ? ` — ${t.payee}` : ""}</option>)}</select></label>
            <details className="pf-more"><summary>Save this layout as a template</summary>
              <label>Template name<input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. SBI Current Account" disabled={busy} /></label>
              <div className="cd-actions"><button className="cd-btn cd-btn-secondary" type="button" onClick={() => void saveTemplate(false)} disabled={busy}>Save as template</button>{selectedTemplate && <button className="cd-btn cd-btn-ghost" type="button" onClick={() => void saveTemplate(true)} disabled={busy}>Update</button>}</div>
            </details>
          </div>

          <div className="cd-card">
            <div className="cd-card-head"><strong><b className="pf-num">1</b>Cheque details</strong><span>All four are required</span></div>
            <label className={`pf-f ${fstate(numOk, !!chequeNumber)}`}><span className="pf-top"><span>Actual cheque number</span><span className="pf-req">{numOk ? "✓ Done" : "Required"}</span></span>
              <input id="pf-num" inputMode="numeric" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value.replace(/\D/g, "").slice(0, 18))} onKeyDown={enterTo("pf-payee")} placeholder="e.g. 002536" disabled={busy} />
              <span className="pf-msg">{!chequeNumber ? "The number printed on the physical cheque leaf. It is for your register only and is never printed." : numOk ? "Saved to your register. Leading zeros are kept." : "Use digits only — it cannot be zero."}</span></label>
            <label className={`pf-f ${fstate(payeeOk, false)}`}><span className="pf-top"><span>Payee</span><span className="pf-req">{payeeOk ? "✓ Done" : "Required"}</span></span>
              <input id="pf-payee" value={payee} onChange={(e) => setPayee(e.target.value)} onKeyDown={enterTo("pf-date")} disabled={busy} placeholder="Who is this cheque for?" list="pf-payee-list" autoComplete="off" /><datalist id="pf-payee-list">{payeeOptions.map((n) => <option key={n} value={n} />)}</datalist>
              <span className="pf-msg">{payeeOk ? "Printed exactly as typed." : "Type a name or pick a saved payee."}</span></label>
            {suggestions.length > 0 && <div className="pf-chips" aria-label="Saved payees">{suggestions.map((n) => <button key={n} type="button" onClick={() => setPayee(n)}>{n}</button>)}</div>}
            <div className="cd-cal-grid">
              <label className={`pf-f ${fstate(dateOk, date.length > 0)}`}><span className="pf-top"><span>Date</span><span className="pf-req">{dateOk ? "✓ Done" : "Required"}</span></span>
                <input id="pf-date" inputMode="numeric" value={date} onChange={(e) => setDate(e.target.value.replace(/\D/g, "").slice(0, 8))} onKeyDown={enterTo("pf-amount")} disabled={busy} placeholder="30102026" />
                <span className="pf-msg">{dateOk ? dateLabel : date ? "Keep typing — 8 digits, DDMMYYYY" : "DDMMYYYY, e.g. 30102026"} <button type="button" className="pf-link" onClick={fillToday}>Use today</button></span></label>
              <label className={`pf-f ${fstate(amtOk, !!amount)}`}><span className="pf-top"><span>Amount</span><span className="pf-req">{amtOk ? "✓ Done" : "Required"}</span></span>
                <span className="pf-input"><b>₹</b><input id="pf-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))} disabled={busy} placeholder="0.00" /></span>
                <span className="pf-msg">{amtOk ? `₹${formatIndianAmount(amount)}` : amount ? "Digits with up to 2 decimals." : "In rupees, e.g. 136459.00"}</span></label>
            </div>
            {amtOk && <div className="pf-words"><small>In words</small>{words}</div>}
            {dateWarning && <div className="cd-helper cd-warn" role="status">{dateWarning}</div>}
            <label><span>Notes <span className="label-hint">optional</span></span><input className="notes-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reference or reason (for your register)" disabled={busy} /></label>
            <label className="upload"><span>Calibration background <span className="label-hint">optional</span></span><input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; setBg(f ? URL.createObjectURL(f) : null); }} disabled={busy} /><span>Upload a photo or scan of your cheque to line fields up on screen. It is never printed.</span></label>
          </div>

          <div className="cd-card cd-toggle-card">
            <div className="cd-card-head"><strong><b className="pf-num">2</b>Crossing</strong><span>Turn off for non A/C Payee cheques</span></div>
            <Toggle checked={enabled("acPayee")} onChange={(v) => field("acPayee", "enabled", v)} label="A/C PAYEE text" note="Print the A/C PAYEE wording" />
            <Toggle checked={enabled("acPayeeTopLine")} onChange={(v) => field("acPayeeTopLine", "enabled", v)} label="Top crossing line" note="Print the upper line" />
            <Toggle checked={enabled("acPayeeBottomLine")} onChange={(v) => field("acPayeeBottomLine", "enabled", v)} label="Bottom crossing line" note="Print the lower line" />
          </div>

          <details className="cd-card pf-cal" open={calOpen} onToggle={(e) => setCalOpen((e.currentTarget as HTMLDetailsElement).open)}>
            <summary><span><b className="pf-num">3</b>Fine-tune position <em>{FIELD_LABELS[sel]} · X {r1(c.x)} · Y {r1(c.y)} mm</em></span><i aria-hidden="true">⌄</i></summary>
            <div className="pf-cal-body">
              <div className="pf-chips pf-field-chips" role="tablist" aria-label="Field to adjust">{FIELD_CHIPS.map((f) => <button key={f.k} type="button" role="tab" aria-selected={sel === f.k} className={sel === f.k ? "on" : ""} onClick={() => setSel(f.k)}>{f.t}</button>)}</div>
              <div className="pf-nudge">
                <div className="pf-pad" aria-label="Move selected field">
                  <button type="button" aria-label="Move up" onClick={() => field(sel, "y", r1(c.y - nudge))}>▲</button>
                  <button type="button" aria-label="Move left" onClick={() => field(sel, "x", r1(c.x - nudge))}>◀</button>
                  <button type="button" aria-label="Move right" onClick={() => field(sel, "x", r1(c.x + nudge))}>▶</button>
                  <button type="button" aria-label="Move down" onClick={() => field(sel, "y", r1(c.y + nudge))}>▼</button>
                </div>
                <div className="pf-step"><small>Nudge by</small>{[0.1, 0.5, 1].map((n) => <button key={n} type="button" className={nudge === n ? "on" : ""} onClick={() => setNudge(n)}>{n} mm</button>)}</div>
              </div>
              <div className="cd-cal-grid"><label><span>X <span className="label-hint">mm from left</span></span><input type="number" step="0.1" value={c.x} onChange={(e) => field(sel, "x", +e.target.value)} /></label><label><span>Y <span className="label-hint">mm from top</span></span><input type="number" step="0.1" value={c.y} onChange={(e) => field(sel, "y", +e.target.value)} /></label></div>
              {c.font != null && <label><span>Font size <span className="label-hint">pt</span></span><input type="number" step="0.5" value={c.font} onChange={(e) => field(sel, "font", +e.target.value)} /></label>}
              {c.width != null && <label><span>Width <span className="label-hint">mm</span></span><input type="number" step="0.1" value={c.width} onChange={(e) => field(sel, "width", +e.target.value)} /></label>}
              {(c.angle != null || sel === "acPayee" || sel === "acPayeeTopLine" || sel === "acPayeeBottomLine") && <label><span>Angle <span className="label-hint">degrees</span></span><input type="number" step="1" value={c.angle ?? 0} onChange={(e) => field(sel, "angle", +e.target.value)} /></label>}
              {sel === "date" && <label><span>Digit spacing <span className="label-hint">mm</span></span><input type="number" step="0.1" value={c.spacing ?? 0} onChange={(e) => field(sel, "spacing", +e.target.value)} /></label>}
              {(sel === "acPayeeTopLine" || sel === "acPayeeBottomLine") && <div className="cd-helper">Each crossing line is calibrated independently, so you can match different cheque books precisely.</div>}
              <div className="cd-helper">Tip: you can also drag any field directly on the cheque preview.</div>
            </div>
          </details>

          <div className="pf-actionbar">
            {doneCount < 4 && <div className="pf-hint" role="status">{4 - doneCount} required {4 - doneCount === 1 ? "detail is" : "details are"} still missing — tap print to jump to {4 - doneCount === 1 ? "it" : "the first one"}.</div>}
            <div className="cd-actions"><button className="cd-btn cd-btn-secondary" type="button" onClick={() => trySave(false)} disabled={busy}>Save draft</button><button className={`cd-btn cd-btn-primary${doneCount < 4 ? " pf-incomplete" : ""}`} type="button" onClick={() => trySave(true)} disabled={busy}>Save &amp; print</button></div>
          </div>
          {error && <div className="cd-error" role="alert">{error}</div>}
          <div className="cd-status"><i />{status}</div>
        </aside>

        <section className="cd-stage">
          <div className="cd-stage-head"><div><strong>Live cheque preview</strong><span>{FIELD_LABELS[sel]} · X {r1(c.x)} mm · Y {r1(c.y)} mm — drag it on the cheque or fine-tune on the left.</span></div>
            <div className="pf-tools" role="group" aria-label="Preview aids"><button type="button" className={showRulers ? "on" : ""} aria-pressed={showRulers} onClick={() => setShowRulers((v) => !v)}>Rulers</button><button type="button" className={showGrid ? "on" : ""} aria-pressed={showGrid} onClick={() => setShowGrid((v) => !v)}>10 mm grid</button><button type="button" className={showGuides ? "on" : ""} aria-pressed={showGuides} onClick={() => setShowGuides((v) => !v)}>Guides</button></div>
          </div>
          <div ref={wrapRef} className="cd-preview-wrap" style={{ ["--pf-mm" as string]: `${box.w / 200}px`, ["--pf-zoom" as string]: String(zoom) } as React.CSSProperties}>
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
            {box.w > 0 && <>
              <div className="pf-chrome pf-dim pf-dim-h" style={{ left: box.l, width: box.w, top: Math.max(2, box.t - 52) }}><i /><span>200 mm <small>7.87 in</small></span></div>
              <div className="pf-chrome pf-dim pf-dim-v" style={{ top: box.t, height: box.h, left: Math.max(2, box.l - 52) }}><i /><span>100 mm <small>3.94 in</small></span></div>
              {showRulers && <>
                <div className="pf-chrome pf-ruler pf-ruler-h" style={{ left: box.l, width: box.w, top: box.t - 20 }}>{Array.from({ length: Math.floor(200 / (box.w > 520 ? 20 : 50)) + 1 }, (_, i) => i * (box.w > 520 ? 20 : 50)).map((n) => <b key={n} style={{ left: `calc(var(--pf-mm) * ${n})` }}>{n}</b>)}</div>
                <div className="pf-chrome pf-ruler pf-ruler-v" style={{ top: box.t, height: box.h, left: box.l - 22 }}>{Array.from({ length: 6 }, (_, i) => i * 20).map((n) => <b key={n} style={{ top: `calc(var(--pf-mm) * ${n})` }}>{n}</b>)}</div>
              </>}
              {showGrid && <div className="pf-chrome pf-grid" style={{ left: box.l, top: box.t, width: box.w, height: box.h }} />}
              {showGuides && <div className="pf-chrome pf-guides" style={{ left: box.l, top: box.t, width: box.w, height: box.h }}>
                <i className="v" style={{ left: `${cfg[sel].x / 2}%` }} /><i className="h" style={{ top: `${cfg[sel].y}%` }} />
                <em style={{ left: `${cfg[sel].x / 2}%`, top: `${cfg[sel].y}%` }}>X {r1(cfg[sel].x)} · Y {r1(cfg[sel].y)}</em>
              </div>}
              <span className="pf-chrome pf-crop tl" style={{ left: box.l - 9, top: box.t - 9 }} /><span className="pf-chrome pf-crop tr" style={{ left: box.l + box.w - 1, top: box.t - 9 }} /><span className="pf-chrome pf-crop bl" style={{ left: box.l - 9, top: box.t + box.h - 1 }} /><span className="pf-chrome pf-crop br" style={{ left: box.l + box.w - 1, top: box.t + box.h - 1 }} />
            </>}
          </div>
          <div className="cd-preview-note">The cheque remains a true 200 × 100 mm calibration surface. Screen scaling does not change stored millimetre positions.</div>
          <div className="pf-chrome pf-scale"><span>Preview scale <b>{Math.round(zoom * 100)}%</b> of real size</span><span>Prints 1:1 on a <b>200 × 100 mm</b> leaf</span></div>
          <div className="pf-chrome pf-printcheck"><strong>Before you print</strong><ul><li>Paper size: 200 × 100 mm (custom)</li><li>Scale: 100% / actual size</li><li>Margins: none</li></ul><p>Tip: print once on plain paper and hold it over a real cheque leaf, against the light, to check alignment.</p></div>
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
