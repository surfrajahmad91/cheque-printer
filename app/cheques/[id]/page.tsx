import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChequeActions } from "@/components/cheque-actions";
import { fmtDateIN, fmtDateTimeIST } from "@/lib/format";

export default async function ChequeDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cheque, error: chequeError } = await supabase.from("cheques").select("*, payees(name)").eq("id", id).eq("user_id", user.id).single();
  if (chequeError || !cheque) notFound();

  const { data: history } = await supabase.from("print_history").select("id,print_number,printed_at,notes").eq("cheque_id", id).eq("user_id", user.id).order("printed_at", { ascending: false });
  const payeeName = cheque.payees?.name || "Untitled cheque";
  const canEdit = cheque.status === "draft";
  const canPrint = cheque.status !== "cancelled" && cheque.status !== "void";

  return (
    <main className="main">
      <div className="toolbar">
        <div><Link href="/cheques" className="back">← Cheque Register</Link><h1>{payeeName}</h1><p className="muted">Cheque {cheque.cheque_number || "—"} · ₹{Number(cheque.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p></div>
        <div className="action-row"><Link className="btn secondary" href="/designer">New cheque</Link>{canEdit && <Link className="btn" href={`/designer?edit=${cheque.id}`}>Edit draft</Link>}</div>
      </div>

      <div className="detail-grid">
        <section className="card">
          <div className="section-heading"><div><h2>Cheque details</h2><p className="muted">The cheque number is stored for your physical cheque record.</p></div><span className={`status-pill status-${cheque.status}`}>{cheque.status}</span></div>
          <dl className="details">
            <div><dt>Payee</dt><dd>{payeeName}</dd></div><div><dt>Date</dt><dd>{fmtDateIN(cheque.cheque_date)}</dd></div><div><dt>Cheque number</dt><dd>{cheque.cheque_number || "—"}</dd></div><div><dt>Amount</dt><dd className="amount-strong">₹{Number(cheque.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</dd></div><div><dt>Amount in words</dt><dd>{cheque.amount_in_words || "—"}</dd></div><div><dt>Print count</dt><dd>{cheque.print_count ?? 0}</dd></div><div><dt>First printed</dt><dd>{cheque.first_printed_at ? fmtDateTimeIST(cheque.first_printed_at) : "Not printed"}</dd></div><div><dt>Last printed</dt><dd>{cheque.last_printed_at ? fmtDateTimeIST(cheque.last_printed_at) : "Not printed"}</dd></div><div><dt>Notes</dt><dd>{cheque.notes || "No notes"}</dd></div>
          </dl>
          {!canPrint && <div className="helper">This cheque is locked from printing because it is {cheque.status}.</div>}
        </section>

        <section className="card">
          <div className="section-heading"><div><h2>Print history</h2><p className="muted">Every successful print and reprint is recorded.</p></div><span className="history-count">{history?.length || 0}</span></div>
          {history?.length ? <div className="history-list">{history.map((item) => <div className="history-item" key={item.id}><div><strong>Print #{item.print_number}</strong><span className="muted">{fmtDateTimeIST(item.printed_at)}</span></div><p>{item.notes || "No print note"}</p></div>)}</div> : <div className="empty compact-empty"><h3>Not printed yet</h3><p className="muted">The first print will appear here.</p></div>}
        </section>
      </div>

      <ChequeActions chequeId={cheque.id} status={cheque.status} notes={cheque.notes || ""} printCount={cheque.print_count || 0} />
    </main>
  );
}
