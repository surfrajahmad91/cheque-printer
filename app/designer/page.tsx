import {redirect,notFound} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {ChequeDesigner} from "@/components/cheque-designer";

const dragTargetStyles = `
  /* Interactive calibration targets: keep the printed geometry unchanged while giving every draggable field a forgiving screen hit area. */
  .designer-page-layout .cheque-canvas .cal-item{
    touch-action:none!important;
    user-select:none!important;
    -webkit-user-select:none!important;
    -webkit-touch-callout:none!important;
    -webkit-tap-highlight-color:transparent!important;
    cursor:grab!important;
    z-index:20!important;
  }
  .designer-page-layout .cheque-canvas .cal-item:active{cursor:grabbing!important}
  .designer-page-layout .cheque-canvas .cal-item::after{
    content:"";
    position:absolute;
    left:-5px;
    right:-5px;
    top:-7px;
    bottom:-7px;
    min-width:24px;
    min-height:24px;
    border-radius:6px;
    background:transparent;
    pointer-events:auto;
  }
  /* Lines have little or no intrinsic height, so their invisible hit area must provide the actual drag target. */
  .designer-page-layout .cheque-canvas .cal-item.ac-line::after{
    left:-6px;
    right:-6px;
    top:-10px;
    bottom:-10px;
    min-height:24px;
  }
  /* Amount-in-words rows can legitimately be empty while calibrating; keep both rows selectable anyway. */
  .designer-page-layout .cheque-canvas .cal-item.words1,
  .designer-page-layout .cheque-canvas .cal-item.words2{
    min-height:24px!important;
  }
  .designer-page-layout .cheque-canvas .cal-item.words1::after,
  .designer-page-layout .cheque-canvas .cal-item.words2::after{
    left:-6px;
    right:-6px;
    top:-9px;
    bottom:-9px;
    min-height:24px;
  }
  .designer-page-layout .cheque-canvas .cal-item.selected{z-index:60!important}
  .designer-page-layout .cheque-canvas .cal-item.selected::after{
    outline:1px solid rgba(21,169,133,.28);
    outline-offset:1px;
  }
  /* Keep the screen-only drag affordances out of the physical print output. */
  @media print{
    .designer-page-layout .cheque-canvas .cal-item::after{display:none!important}
  }
`;

const printStyles = `
  @media print{
    @page{size:200mm 100mm;margin:0!important}
    html,body{width:200mm!important;height:100mm!important;margin:0!important;padding:0!important;overflow:hidden!important;background:#fff!important}
    body>*{display:none!important}
    .designer-page-layout{display:block!important;width:200mm!important;height:100mm!important;margin:0!important;padding:0!important;overflow:hidden!important;background:#fff!important}
    .designer-page-layout .cd-page{display:block!important;width:200mm!important;height:100mm!important;min-height:100mm!important;margin:0!important;padding:0!important;overflow:hidden!important;background:#fff!important}
    .designer-page-layout .cd-page>*{display:none!important}
    .designer-page-layout .cd-page .cd-shell{display:block!important;width:200mm!important;height:100mm!important;margin:0!important;padding:0!important}
    .designer-page-layout .cd-shell>*{display:none!important}
    .designer-page-layout .cd-shell .cd-layout{display:block!important;width:200mm!important;height:100mm!important;margin:0!important;padding:0!important}
    .designer-page-layout .cd-layout>*{display:none!important}
    .designer-page-layout .cd-layout .cd-stage{display:block!important;width:200mm!important;height:100mm!important;margin:0!important;padding:0!important;background:#fff!important;border:0!important;box-shadow:none!important}
    .designer-page-layout .cd-stage>*{display:none!important}
    .designer-page-layout .cd-stage .cd-preview-wrap{display:block!important;width:200mm!important;height:100mm!important;min-width:200mm!important;min-height:100mm!important;max-width:200mm!important;max-height:100mm!important;margin:0!important;padding:0!important;overflow:hidden!important;background:#fff!important;border:0!important;box-shadow:none!important}
    .designer-page-layout .cd-stage .cd-preview-wrap .cheque-canvas{display:block!important;position:relative!important;left:0!important;top:0!important;width:200mm!important;height:100mm!important;min-width:200mm!important;min-height:100mm!important;max-width:200mm!important;max-height:100mm!important;margin:0!important;padding:0!important;zoom:1!important;transform:none!important;transform-origin:top left!important;background-image:none!important;background:#fff!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:hidden!important}
    .designer-page-layout .cheque-canvas .cal-item{visibility:visible!important;opacity:1!important;outline:none!important;box-shadow:none!important}
    .designer-page-layout .cheque-canvas .cal-item.selected{outline:none!important;box-shadow:none!important}
  }
`;

export default async function Designer({searchParams}:{searchParams:Promise<{edit?:string}>}){
  const {edit}=await searchParams;
  if(!edit)return <div className="designer-page-layout"><style>{`\n    .designer-page-layout .cd-layout{grid-template-columns:1fr!important;gap:22px!important;align-items:stretch!important}\n    .designer-page-layout .cd-panel{order:1;width:100%;min-width:0}\n    .designer-page-layout .cd-stage{order:2;width:100%;min-width:0}\n    .designer-page-layout .cd-preview-wrap{min-height:0!important;max-height:none!important;justify-content:center!important;overflow:auto}\n    .designer-page-layout .cd-stage-head{max-width:100%}\n    @media(max-width:900px){.designer-page-layout .cd-layout{gap:16px!important}.designer-page-layout .cd-preview-wrap{justify-content:flex-start!important}}\n  `}{dragTargetStyles}{printStyles}</style><ChequeDesigner/></div>;
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
  return <div className="designer-page-layout"><style>{`\n    .designer-page-layout .cd-layout{grid-template-columns:1fr!important;gap:22px!important;align-items:stretch!important}\n    .designer-page-layout .cd-panel{order:1;width:100%;min-width:0}\n    .designer-page-layout .cd-stage{order:2;width:100%;min-width:0}\n    .designer-page-layout .cd-preview-wrap{min-height:0!important;max-height:none!important;justify-content:center!important;overflow:auto}\n    .designer-page-layout .cd-stage-head{max-width:100%}\n    @media(max-width:900px){.designer-page-layout .cd-layout{gap:16px!important}.designer-page-layout .cd-preview-wrap{justify-content:flex-start!important}}\n  `}{dragTargetStyles}{printStyles}</style><ChequeDesigner initialDraft={{id:cheque.id,chequeNumber:cheque.cheque_number,payee:payeeName||"",date:snapshot.date||(cheque.cheque_date?String(cheque.cheque_date).slice(8,10)+String(cheque.cheque_date).slice(5,7)+String(cheque.cheque_date).slice(0,4):""),amount:String(cheque.amount??""),notes:cheque.notes||"",config:snapshot.calibration||undefined}}/></div>;
}