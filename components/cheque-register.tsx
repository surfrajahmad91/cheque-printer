"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Row = { id:string; cheque_number:string; cheque_date:string; amount:number; status:string; created_at:string; print_count:number; payees?:{name:string}|null };

export function ChequeRegister({ rows }: { rows: Row[] }) {
  const [query,setQuery]=useState(""); const [status,setStatus]=useState("all"); const [sort,setSort]=useState("newest");
  const filtered=useMemo(()=>rows.filter(r=>{const q=query.trim().toLowerCase(); return (!q||r.cheque_number.toLowerCase().includes(q)||(r.payees?.name||"").toLowerCase().includes(q))&&(status==="all"||r.status===status)}).sort((a,b)=>sort==="amount"?Number(b.amount)-Number(a.amount):sort==="oldest"?a.created_at.localeCompare(b.created_at):b.created_at.localeCompare(a.created_at)),[rows,query,status,sort]);
  return <>
    <div className="register-toolbar card"><div className="search-box"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search payee or cheque number" /></div><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="printed">Printed</option><option value="reprinted">Reprinted</option><option value="cancelled">Cancelled</option><option value="void">Void</option></select><select value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="amount">Highest amount</option></select>{(query||status!=="all")&&<button className="btn ghost" onClick={()=>{setQuery("");setStatus("all")}}>Clear</button>}</div>
    <div className="register-summary"><span><strong>{filtered.length}</strong> shown of {rows.length}</span><span>{query||status!=="all"?"Filters active":"All saved cheques"}</span></div>
    <div className="card table-wrap"><table className="table"><thead><tr><th>Date</th><th>Cheque No.</th><th>Payee</th><th>Amount</th><th>Status</th><th>Prints</th><th></th></tr></thead><tbody>{filtered.map(c=><tr key={c.id}><td>{c.cheque_date||"—"}</td><td>{c.cheque_number||"—"}</td><td>{c.payees?.name||"—"}</td><td>₹{Number(c.amount||0).toLocaleString("en-IN",{minimumFractionDigits:2})}</td><td><span className={`status-pill status-${c.status}`}>{c.status}</span></td><td>{c.print_count??0}</td><td>{c.status==="draft"?<Link className="text-link" href={`/designer?edit=${c.id}`}>Edit</Link>:<Link className="text-link" href={`/cheques/${c.id}`}>View</Link>}</td></tr>)}</tbody></table>{!filtered.length&&<div className="empty"><h3>No matching cheques</h3><p className="muted">Try a different search or clear the filters.</p></div>}</div>
  </>;
}
