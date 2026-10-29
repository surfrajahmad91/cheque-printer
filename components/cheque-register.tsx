import Link from "next/link";
import {PAGE_SIZE,registerHref,type RegisterParams} from "@/lib/register-query";

type Row={id:string;cheque_number:string;cheque_date:string;amount:number;status:string;created_at:string;print_count:number;payees?:{name:string}|null};

export function ChequeRegister({rows,total,params}:{rows:Row[];total:number;params:RegisterParams}){
  const filtered=!!params.q||params.status!=="all";
  const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  const start=total?(params.page-1)*PAGE_SIZE+1:0;
  const end=Math.min(total,(params.page-1)*PAGE_SIZE+rows.length);
  const exportHref=registerHref({...params,page:1},"/api/cheques/export");
  return <>
    <form className="register-toolbar card" method="get" action="/cheques" role="search">
      <div className="search-box"><span aria-hidden="true">⌕</span><input name="q" defaultValue={params.q} placeholder="Search payee or cheque number" aria-label="Search payee or cheque number"/></div>
      <select name="status" defaultValue={params.status} aria-label="Filter by status"><option value="all">All statuses</option><option value="draft">Draft</option><option value="printed">Printed</option><option value="reprinted">Reprinted</option><option value="cancelled">Cancelled</option><option value="void">Void</option></select>
      <select name="sort" defaultValue={params.sort} aria-label="Sort order"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="amount">Highest amount</option></select>
      <button className="btn" type="submit">Apply</button>
    </form>
    <div className="register-summary"><span><strong>{total?`${start}–${end}`:0}</strong> of {total} {filtered?"matching":"saved"} cheques{filtered&&<> · <Link className="text-link" href="/cheques">Clear filters</Link></>}</span>{total>0&&<a className="text-link" href={exportHref} download>Export CSV ↓</a>}</div>
    <div className="card table-wrap"><table className="table"><thead><tr><th>Date</th><th>Cheque No.</th><th>Payee</th><th>Amount</th><th>Status</th><th>Prints</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{rows.map(c=><tr key={c.id}><td>{c.cheque_date||"—"}</td><td>{c.cheque_number||"—"}</td><td>{c.payees?.name||"—"}</td><td>₹{Number(c.amount||0).toLocaleString("en-IN",{minimumFractionDigits:2})}</td><td><span className={`status-pill status-${c.status}`}>{c.status}</span></td><td>{c.print_count??0}</td><td>{c.status==="draft"?<Link className="text-link" href={`/designer?edit=${c.id}`}>Edit</Link>:<Link className="text-link" href={`/cheques/${c.id}`}>View</Link>}</td></tr>)}</tbody></table>{!rows.length&&<div className="empty"><h3>{filtered?"No matching cheques":"No cheques yet"}</h3><p className="muted">{filtered?"Try a different search or clear the filters.":"Cheques you save or print will appear here."}</p></div>}</div>
    {pages>1&&<nav className="pager" aria-label="Register pages">{params.page>1?<Link className="btn ghost" href={registerHref({...params,page:params.page-1})}>← Previous</Link>:<span className="btn ghost is-disabled" aria-disabled="true">← Previous</span>}<span className="pager-count">Page {params.page} of {pages}</span>{params.page<pages?<Link className="btn ghost" href={registerHref({...params,page:params.page+1})}>Next →</Link>:<span className="btn ghost is-disabled" aria-disabled="true">Next →</span>}</nav>}
  </>;
}
