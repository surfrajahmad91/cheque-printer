"use server";
import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";

const siteUrl=()=>process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000";

export async function login(formData:FormData){
  const s=await createClient();
  const email=String(formData.get("email")||"").trim();
  const password=String(formData.get("password")||"");
  const {error}=await s.auth.signInWithPassword({email,password});
  if(error)redirect(`/login?error=${encodeURIComponent(error.message)}`);

  const {data:claimsData}=await s.auth.getClaims();
  const userId=claimsData?.claims?.sub as string|undefined;
  if(!userId){await s.auth.signOut();redirect("/login?error=Unable%20to%20start%20your%20session");}
  const {data:profile}=await s.from("profiles").select("account_status").eq("id",userId).maybeSingle();
  if(profile?.account_status!=="approved"){
    await s.auth.signOut();
    redirect(`/account-pending?status=${encodeURIComponent(profile?.account_status||"pending")}`);
  }
  redirect("/dashboard");
}

export async function signup(formData:FormData){
  const s=await createClient();
  const email=String(formData.get("email")||"").trim();
  const password=String(formData.get("password")||"");
  const name=String(formData.get("name")||"").trim();
  const {data,error}=await s.auth.signUp({email,password,options:{data:{name},emailRedirectTo:`${siteUrl()}/auth/callback`}});
  if(error)redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  if(data.session)await s.auth.signOut();
  redirect(`/account-pending?stage=${data.session?"review":"verify"}`);
}

export async function requestPasswordReset(formData:FormData){
  const s=await createClient();
  const email=String(formData.get("email")||"").trim();
  if(!email)redirect("/forgot-password?error=Enter%20your%20email%20address");
  const {error}=await s.auth.resetPasswordForEmail(email,{redirectTo:`${siteUrl()}/auth/callback?type=recovery`});
  if(error)redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  redirect("/forgot-password?sent=1");
}

export async function updatePassword(formData:FormData){
  const s=await createClient();
  const password=String(formData.get("password")||"");
  const confirm=String(formData.get("confirmPassword")||"");
  if(password.length<6)redirect("/reset-password?error=Password%20must%20be%20at%20least%206%20characters");
  if(password!==confirm)redirect("/reset-password?error=Passwords%20do%20not%20match");
  const {error}=await s.auth.updateUser({password});
  if(error)redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  await s.auth.signOut();
  redirect("/login?success=Password%20updated.%20Please%20sign%20in%20with%20your%20new%20password");
}
