"use client";

import {FormEvent, useState} from "react";
import {createClient} from "@/lib/supabase/client";

export default function ForgotPasswordForm(){
  const [email,setEmail]=useState("");
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try{
      const supabase=createClient();
      const redirectTo=`${window.location.origin}/auth/callback?type=recovery`;
      const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo});
      if(error){
        setError(error.message);
      }else{
        setMessage("If an account exists for that email, a password-reset email has been sent. Check your inbox and spam folder.");
      }
    }catch{
      setError("Unable to send the reset link right now. Please try again.");
    }finally{
      setLoading(false);
    }
  }

  return <form onSubmit={submit}>
    {error&&<div role="alert" className="error-message">{error}</div>}
    {message&&<div role="status" className="success-message">{message}</div>}
    <div className="field"><label htmlFor="reset-email">Email</label><input id="reset-email" name="email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} disabled={loading}/></div>
    <button className="btn" style={{width:"100%"}} disabled={loading}>{loading?"Sending…":"Send reset link"}</button>
  </form>;
}
