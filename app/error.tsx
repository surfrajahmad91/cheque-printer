"use client";
import {useEffect} from "react";
import Link from "next/link";

export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  useEffect(()=>{console.error(error)},[error]);
  return <main className="main"><section className="card empty" role="alert">
    <span className="eyebrow">SOMETHING WENT WRONG</span>
    <h1>We couldn’t load this page</h1>
    <p className="muted">This is usually temporary. Your saved cheques and templates are safe — please try again.</p>
    <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginTop:18}}>
      <button className="btn" type="button" onClick={()=>reset()}>Try again</button>
      <Link className="btn ghost" href="/dashboard">Back to dashboard</Link>
    </div>
    {error.digest&&<p className="muted" style={{marginTop:18,fontSize:11}}>Reference: {error.digest}</p>}
  </section></main>;
}
