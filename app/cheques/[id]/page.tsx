import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChequeActions } from "@/components/cheque-actions";

export default async function ChequeDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cheque } = await supabase
    .from("cheques")
    .select("*")
    .eq("id", id)
    .single();

  if (!cheque) notFound();

  const { data: history } = await supabase
    .from("print_history")
    .select("id,print_number,printed_at,notes")
    .eq("cheque_id", id)
    .order("printed_at", { ascending: false });

  return (
    <main className="main">
      <div className="toolbar">
        <div>
          <Link href="/cheques" className="back">← Cheque Register</Link>
          <h1>{cheque.payee || "Untitled cheque"}</h1>
          <p className="muted">Cheque record and print history</p>
        </div>
        <Link className="btn secondary" href="/designer">New cheque</Link>
      </div>

      <div className="detail-grid">
        <section className="card">
          <h2>Cheque details</h2>
          <dl className="details">
            <div><dt>Payee</dt><dd>{cheque.payee || "—"}</dd></div>
            <div><dt>Date</dt><dd>{cheque.cheque_date || "—"}</dd></div>
            <div><dt>Cheque number</dt><dd>{cheque.cheque_number || "—"}</dd></div>
            <div><dt>Amount</dt><dd>₹{Number(cheque.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</dd></div>
            <div><dt>Amount in words</dt><dd>{cheque.amount_in_words || "—"}</dd></div>
            <div><dt>Status</dt><dd><span className="badge">{cheque.status}</span></dd></div>
            <div><dt>Print count</dt><dd>{cheque.print_count ?? 0}</dd></div>
            <div><dt>Notes</dt><dd>{cheque.notes || "No notes"}</dd></div>
          </dl>
        </section>

        <section className="card">
          <h2>Print history</h2>
          {history?.length ? (
            <div className="history-list">
              {history.map((item) => (
                <div className="history-item" key={item.id}>
                  <div><strong>Print #{item.print_number}</strong><span className="muted">{new Date(item.printed_at).toLocaleString("en-IN")}</span></div>
                  <p>{item.notes || "No print note"}</p>
                </div>
              ))}
            </div>
          ) : <p className="muted">This cheque has not been printed.</p>}
        </section>
      </div>

      <ChequeActions chequeId={cheque.id} status={cheque.status} notes={cheque.notes || ""} />
    </main>
  );
}
