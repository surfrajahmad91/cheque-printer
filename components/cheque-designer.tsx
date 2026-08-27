"use client";

import { useMemo, useState } from "react";

type Item = { x: number; y: number; font: number; width?: number; angle?: number; text?: string };

const initial = {
  acPayee: { x: 14, y: 10, font: 12, width: 24, angle: -40, topLineY: -2.3, bottomLineY: 2.3 },
  date: { x: 154, y: 10, font: 12, spacing: 0.8 },
  payee: { x: 30, y: 28, font: 12, width: 90 },
  amount: { x: 154, y: 29, font: 12, width: 35 },
  words1: { x: 30, y: 39, font: 11, width: 120 },
  words2: { x: 30, y: 46, font: 11, width: 120 },
};

function inWords(n: number) {
  if (!Number.isFinite(n)) return "";
  const ones = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
  const tens = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];
  const below100 = (v:number):string => v < 20 ? ones[v] : tens[Math.floor(v/10)] + (v%10 ? " " + ones[v%10] : "");
  const group = (v:number):string => v < 100 ? below100(v) : v < 1000 ? `${ones[Math.floor(v/100)]} hundred${v%100 ? " " + below100(v%100) : ""}` : v < 100000 ? `${below100(Math.floor(v/1000))} thousand${v%1000 ? " " + group(v%1000) : ""}` : v < 10000000 ? `${below100(Math.floor(v/100000))} lakh${v%100000 ? " " + group(v%100000) : ""}` : `${group(Math.floor(v/10000000))} crore${v%10000000 ? " " + group(v%10000000) : ""}`;
  const rupees = Math.floor(Math.abs(n));
  const paise = Math.round((Math.abs(n) - rupees) * 100);
  const result = `${group(rupees)} rupees${paise ? ` and ${group(paise)} paise` : ""}`;
  return n < 0 ? `minus ${result}` : result;
}

export function ChequeDesigner() {
  const [payee, setPayee] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState<keyof typeof initial>("payee");
  const [cfg, setCfg] = useState(initial);
  const [background, setBackground] = useState<string | null>(null);

  const words = useMemo(() => inWords(Number(amount)), [amount]);
  const first = words.slice(0, 115);
  const second = words.slice(115);
  const update = (key: keyof typeof initial, field: string, value: number) => setCfg(c => ({ ...c, [key]: { ...c[key], [field]: value } }));

  return <div className="native-designer">
    <aside className="designer-panel">
      <h2>Cheque Designer</h2>
      <label>Payee<input value={payee} onChange={e=>setPayee(e.target.value)} placeholder="Payee name" /></label>
      <label>Date (DDMMYYYY)<input inputMode="numeric" maxLength={8} value={date} onChange={e=>setDate(e.target.value.replace(/\D/g, "").slice(0,8))} placeholder="DDMMYYYY" /></label>
      <label>Amount<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" /></label>
      <label>Background for calibration<input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0]; if(f) setBackground(URL.createObjectURL(f));}} /></label>
      <div className="designer-settings"><strong>Selected: {selected}</strong>{(["x","y","font","width"] as const).map(field => field in cfg[selected] && <label key={field}>{field.toUpperCase()}<input type="number" step="0.1" value={(cfg[selected] as Record<string,number>)[field] ?? 0} onChange={e=>update(selected,field,Number(e.target.value))}/></label>)}</div>
    </aside>
    <section className="designer-stage">
      <div className="cheque-canvas" style={{backgroundImage: background ? `url(${background})` : undefined}} onClick={()=>setSelected("payee")}>
        <button className="cal-item ac" onClick={e=>{e.stopPropagation();setSelected("acPayee")}} style={{left:`${cfg.acPayee.x}mm`,top:`${cfg.acPayee.y}mm`,fontSize:`${cfg.acPayee.font}pt`,transform:`rotate(${cfg.acPayee.angle}deg)`}}>A/C PAYEE</button>
        <span className="line top" style={{left:`${cfg.acPayee.x}mm`,top:`${cfg.acPayee.y + cfg.acPayee.topLineY}mm`,width:`${cfg.acPayee.width}mm`,transform:`rotate(${cfg.acPayee.angle}deg)`}} />
        <span className="line bottom" style={{left:`${cfg.acPayee.x}mm`,top:`${cfg.acPayee.y + cfg.acPayee.bottomLineY}mm`,width:`${cfg.acPayee.width}mm`,transform:`rotate(${cfg.acPayee.angle}deg)`}} />
        <span className="cal-item date" onClick={()=>setSelected("date")} style={{left:`${cfg.date.x}mm`,top:`${cfg.date.y}mm`,fontSize:`${cfg.date.font}pt`,letterSpacing:`${cfg.date.spacing}mm`}}>{date || "DDMMYYYY"}</span>
        <span className="cal-item payee" onClick={()=>setSelected("payee")} style={{left:`${cfg.payee.x}mm`,top:`${cfg.payee.y}mm`,fontSize:`${cfg.payee.font}pt`,width:`${cfg.payee.width}mm`}}>{payee || "Payee"}</span>
        <span className="cal-item amount" onClick={()=>setSelected("amount")} style={{left:`${cfg.amount.x}mm`,top:`${cfg.amount.y}mm`,fontSize:`${cfg.amount.font}pt`,width:`${cfg.amount.width}mm`}}>₹ {amount || "0.00"}</span>
        <span className="cal-item words1" onClick={()=>setSelected("words1")} style={{left:`${cfg.words1.x}mm`,top:`${cfg.words1.y}mm`,fontSize:`${cfg.words1.font}pt`,width:`${cfg.words1.width}mm`}}>{first}</span>
        <span className="cal-item words2" onClick={()=>setSelected("words2")} style={{left:`${cfg.words2.x}mm`,top:`${cfg.words2.y}mm`,fontSize:`${cfg.words2.font}pt`,width:`${cfg.words2.width}mm`}}>{second}</span>
      </div>
    </section>
  </div>;
}
