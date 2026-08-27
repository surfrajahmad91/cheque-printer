"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";

type Template={id:string;name:string;layout:any;updated_at:string};

export default function Templates(){
  const [templates,setTemplates]=useState<Template[]>([]);const [busy,setBusy]=useState(true);const [error,setError]=useState("");
  const load=async()=>{setBusy(true);setError("");const s=createClient();const {data,error:e}=await s.from("cheque_templates").select("id,name,layout,updated_at").eq("is_active",true).order("updated_at",{ascending:false});if(e)setError(e.message);else setTemplates(data||[]);setBusy(false)};
  useEffect(()=>{void load()},[]);
  const remove=async(id:string)=>{if(!window.confirm("Delete this template?"))return;const s=createClient();const {error:e}=await s.from("cheque_templates").delete().eq("id",id);if(e)setError(e.message);else setTemplates(x=>x.filter(t=>t.id!==id))};
  return <main className="main"><div className="toolbar"><div><div className="eyebrow">REUSABLE LAYOUTS</div><h1>Cheque templates</h1><p className="muted">Keep calibrated payee and print layouts ready for the next cheque.</p></div><Link className="btn" href="/designer">+ New cheque</Link></div>{error&&<div className="designer-error">{error}</div>}{busy?<div className="card"><p className="muted">Loading templates…</p></div>:templates.length?<div className="template-grid">{templates.map(t=><article className="card template-card" key={t.id}><div className="template-meta"><h3>{t.name}</h3><span className="muted">Payee · {t.layout?.payee||"Not set"}</span><span className="muted">Updated · {new Date(t.updated_at).toLocaleString()}</span></div><div className="template-actions"><Link className="btn secondary" href={`/designer?template=${t.id}`}>Use / Edit</Link><button className="btn ghost" type="button" onClick={()=>void remove(t.id)}>Delete</button></div></article>)}</div>:<section className="card empty"><h3>No templates yet</h3><p className="muted">Open the designer, calibrate your cheque, and save the layout as a reusable template.</p><Link className="btn secondary" href="/designer">Open designer</Link></section>}</main>;
}
