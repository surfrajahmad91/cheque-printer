import {redirect,notFound} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {ChequeDesigner} from "@/components/cheque-designer";

export default async function Designer({searchParams}:{searchParams:Promise<{edit?:string}>}){
  const {edit}=await searchParams;
  if(!edit)return <div className="designer-page-layout"><style>{`\n    .designer-page-layout .cd-layout{grid-template-columns:1fr!important;gap:22px!important;align-items:stretch!important}\n    .designer-page-layout .cd-panel{order:1;width:100%;min-width:0}\n    .designer-page-layout .cd-stage{order:2;width:100%;min-width:0}\n    .designer-page-layout .cd-preview-wrap{min-height:0!important;max-height:none!important;justify-content:center!important;overflow:auto}\n    .designer-page-layout .cd-stage-head{max-width:100%}\n    @media(max-width:900px){.designer-page-layout .cd-layout{gap:16px!important}.designer-page-layout .cd-preview-wrap{justify-content:flex-start!important}}\n  `}</style><ChequeDesigner/></div>;
  const s=await createClient();
  const {data:claimsData}=await s.auth.getClaims();
  const userId=claimsData?.claims?.sub;
  if(!userId)redirect("/login");
  const {data:cheque,error}=await s.from("cheques").select("id,cheque_number,cheque_date,amount,notes,layout_snapshot,payees(name),status").eq("id",edit).eq("user_id",userId).single();
  if(error||!cheque)notFound();
  if(cheque.status!=="draft")redirect(`/cheques/${cheque.id}`);
  const snapshot=(cheque.layout_snapshot||{}) as any;
  const relation=cheque.payees as unknown as {name?:string}|{name?:string}[]|null;
  const payeeName=Array.isArray(relation)?relation[0]?.name:relation?.name;
  return <div className="designer-page-layout"><style>{`\n    .designer-page-layout .cd-layout{grid-template-columns:1fr!important;gap:22px!important;align-items:stretch!important}\n    .designer-page-layout .cd-panel{order:1;width:100%;min-width:0}\n    .designer-page-layout .cd-stage{order:2;width:100%;min-width:0}\n    .designer-page-layout .cd-preview-wrap{min-height:0!important;max-height:none!important;justify-content:center!important;overflow:auto}\n    .designer-page-layout .cd-stage-head{max-width:100%}\n    @media(max-width:900px){.designer-page-layout .cd-layout{gap:16px!important}.designer-page-layout .cd-preview-wrap{justify-content:flex-start!important}}\n  `}</style><ChequeDesigner initialDraft={{id:cheque.id,chequeNumber:cheque.cheque_number,payee:payeeName||"",date:snapshot.date||(cheque.cheque_date?String(cheque.cheque_date).slice(8,10)+String(cheque.cheque_date).slice(5,7)+String(cheque.cheque_date).slice(0,4):""),amount:String(cheque.amount??""),notes:cheque.notes||"",config:snapshot.calibration||undefined}}/></div>;
}