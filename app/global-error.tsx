"use client";

// Last-resort boundary: replaces the root layout, so it carries its own tiny stylesheet.
export default function GlobalError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <html lang="en"><body style={{margin:0,minHeight:"100vh",display:"grid",placeItems:"center",background:"#f4f6f5",color:"#14231e",fontFamily:"Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif",padding:24}}>
    <div role="alert" style={{maxWidth:420,textAlign:"center",background:"#fff",border:"1px solid #e2e8e5",borderRadius:20,padding:"36px 28px",boxShadow:"0 24px 64px rgba(10,26,22,.12)"}}>
      <div style={{fontSize:11,letterSpacing:".16em",fontWeight:700,color:"#b8975a"}}>CHEQUEFLOW</div>
      <h1 style={{fontSize:26,margin:"10px 0 8px"}}>Something went wrong</h1>
      <p style={{color:"#6b7873",fontSize:14,lineHeight:1.6,margin:"0 0 22px"}}>The app hit an unexpected problem. Your saved data is safe. Please try again.</p>
      <button type="button" onClick={()=>reset()} style={{background:"#0b8a6c",color:"#fff",border:0,borderRadius:11,padding:"12px 20px",fontWeight:650,fontSize:14,cursor:"pointer"}}>Try again</button>
      {error.digest&&<p style={{color:"#98a29d",fontSize:11,marginTop:18}}>Reference: {error.digest}</p>}
    </div>
  </body></html>;
}
