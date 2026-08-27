import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChequeDesigner } from "@/components/cheque-designer";

export default async function Designer({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  if (!edit) return <ChequeDesigner />;
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/login");
  const { data: cheque, error } = await s.from("cheques").select("id,cheque_date,amount,notes,layout_snapshot,payees(name),status").eq("id", edit).eq("user_id", user.id).single();
  if (error || !cheque) notFound();
  if (cheque.status !== "draft") redirect(`/cheques/${cheque.id}`);
  const snapshot = (cheque.layout_snapshot || {}) as any;
  const relation = cheque.payees as unknown as { name?: string } | { name?: string }[] | null;
  const payeeName = Array.isArray(relation) ? relation[0]?.name : relation?.name;
  return <ChequeDesigner initialDraft={{ id: cheque.id, payee: payeeName || "", date: snapshot.date || (cheque.cheque_date ? cheque.cheque_date.slice(8,10)+cheque.cheque_date.slice(5,7)+cheque.cheque_date.slice(0,4) : ""), amount: String(cheque.amount ?? ""), notes: cheque.notes || "", config: snapshot.calibration || undefined }} />;
}
