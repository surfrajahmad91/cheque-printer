import {redirect,notFound} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {ChequeDesigner} from "@/components/cheque-designer";

const dragTargetStyles = `
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
  .designer-page-layout .cheque-canvas .cal-item.ac-line::after{
    left:-6px;
    right:-6px;
    top:-10px;
    bottom:-10px;
    min-height:24px;
  }
  .designer-page-layout .cheque-canvas .cal-item.words1,
  .designer-page-layout .cheque-canvas .cal-item.words2{min-height:24px!important}
  .designer-page-layout .cheque-canvas .cal-item.words1::after,
  .designer-page-layout .cheque-canvas .cal-item.words2::after{
    left:-6px;
    right:-6px;
    top:-9px;
    bottom:-9px;
    min-height:24px;
  }
  .designer-page-layout .cheque-canvas .cal-item.selected{z-index:60!important}
  .designer-page-layout .cheque-canvas .cal-item.selected::after{outline:1px solid rgba(21,169,133,.28);outline-offset:1px}
  @media print{.designer-page-layout .cheque-canvas .cal-item::after{display:none!important}}
`;

/*
 * Print ONLY the 200 × 100 mm cheque surface.
 *
 * Important: visibility:hidden leaves layout boxes in the document, which can
 * make mobile browsers paginate the hidden application shell onto a second
 * sheet. During print we therefore remove the screen UI from layout entirely
 * and explicitly keep every ancestor of the cheque canvas alive.
 */
const printStyles = `
  @media print{
    @page{size:200mm 100mm;margin:0!important}
    html,body{
      width:200mm!important;
      height:100mm!important;
      min-width:200mm!important;
      min-height:100mm!important;
      max-width:200mm!important;
      max-height:100mm!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
      background:#fff!important;
    }

    /* Remove the normal screen layout from pagination. */
    body *{display:none!important}

    /* Keep only the DOM chain that contains the real cheque canvas. */
    body .designer-page-layout,
    body .designer-page-layout .cd-layout,
    body .designer-page-layout .cd-stage,
    body .designer-page-layout .cd-preview-wrap,
    body .designer-page-layout .cheque-canvas{
      display:block!important;
      visibility:visible!important;
    }

    body .designer-page-layout{
      position:fixed!important;
      left:0!important;
      top:0!important;
      width:200mm!important;
      height:100mm!important;
      min-width:200mm!important;
      min-height:100mm!important;
      max-width:200mm!important;
      max-height:100mm!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
      background:#fff!important;
    }

    body .designer-page-layout .cd-layout{
      position:static!important;
      width:200mm!important;
      height:100mm!important;
      min-width:200mm!important;
      min-height:100mm!important;
      max-width:200mm!important;
      max-height:100mm!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
      display:block!important;
    }

    body .designer-page-layout .cd-stage{
      position:static!important;
      width:200mm!important;
      height:100mm!important;
      min-width:200mm!important;
      min-height:100mm!important;
      max-width:200mm!important;
      max-height:100mm!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
      display:block!important;
    }

    body .designer-page-layout .cd-stage-head,
    body .designer-page-layout .cd-stage > :not(.cd-preview-wrap),
    body .designer-page-layout .cd-preview-wrap > :not(.cheque-canvas){display:none!important}

    body .designer-page-layout .cd-preview-wrap{
      position:static!important;
      width:200mm!important;
      height:100mm!important;
      min-width:200mm!important;
      min-height:100mm!important;
      max-width:200mm!important;
      max-height:100mm!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
      background:#fff!important;
    }

    body .designer-page-layout .cheque-canvas{
      position:fixed!important;
      left:0!important;
      top:0!important;
      width:200mm!important;
      height:100mm!important;
      min-width:200mm!important;
      min-height:100mm!important;
      max-width:200mm!important;
      max-height:100mm!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
      background:#fff!important;
      background-image:none!important;
      border:0!important;
      border-radius:0!important;
      box-shadow:none!important;
      transform:none!important;
      transform-origin:top left!important;
      zoom:1!important;
    }

    body .designer-page-layout .cheque-canvas .cal-item{
      display:block!important;
      visibility:visible!important;
      opacity:1!important;
      outline:none!important;
      box-shadow:none!important;
    }
    body .designer-page-layout .cheque-canvas .cal-item.selected{outline:none!important;box-shadow:none!important}
    body .designer-page-layout .cheque-canvas .cal-item::after{display:none!important}
  }
`;

const responsiveDesignerStyles = `
  .designer-page-layout .cd-layout{grid-template-columns:1fr!important;gap:22px!important;align-items:stretch!important}
  .designer-page-layout .cd-panel{order:1;width:100%;min-width:0}
  .designer-page-layout .cd-stage{order:2;width:100%;min-width:0}
  .designer-page-layout .cd-preview-wrap{
    min-height:0!important;
    max-height:none!important;
    height:auto!important;
    justify-content:center!important;
    align-items:flex-start!important;
    overflow-x:hidden!important;
    overflow-y:auto!important;
  }
  .designer-page-layout .cd-stage-head{max-width:100%}

  /* The cheque is a true 2:1 surface. On narrow screens it scales down
     proportionally instead of being clipped at the bottom. */
  .designer-page-layout .cheque-canvas{
    width:min(100%,200mm)!important;
    max-width:100%!important;
    height:auto!important;
    min-height:0!important;
    max-height:none!important;
    aspect-ratio:2 / 1!important;
    flex:0 0 auto!important;
  }

  @media(max-width:900px){
    .designer-page-layout .cd-layout{gap:16px!important}
    .designer-page-layout .cd-preview-wrap{
      justify-content:flex-start!important;
      align-items:center!important;
      width:100%!important;
      max-height:65vh!important;
      overflow-x:hidden!important;
      overflow-y:auto!important;
      padding-bottom:4px!important;
    }
    .designer-page-layout .cheque-canvas{
      width:100%!important;
      max-width:100%!important;
      height:auto!important;
      aspect-ratio:2 / 1!important;
    }
  }
`;

export default async function Designer({searchParams}:{searchParams:Promise<{edit?:string}>}){
  const {edit}=await searchParams;
  if(!edit)return <div className="designer-page-layout"><style>{responsiveDesignerStyles}{dragTargetStyles}{printStyles}</style><ChequeDesigner/></div>;
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
  return <div className="designer-page-layout"><style>{responsiveDesignerStyles}{dragTargetStyles}{printStyles}</style><ChequeDesigner initialDraft={{id:cheque.id,chequeNumber:cheque.cheque_number,payee:payeeName||"",date:snapshot.date||(cheque.cheque_date?String(cheque.cheque_date).slice(8,10)+String(cheque.cheque_date).slice(5,7)+String(cheque.cheque_date).slice(0,4):""),amount:String(cheque.amount??""),notes:cheque.notes||"",config:snapshot.calibration||undefined}}/></div>;
}