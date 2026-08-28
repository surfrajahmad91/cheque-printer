"use server";
import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";

const siteUrl=()=>process.env.NEXT_PUBLIC_SITE_URL||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL?`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`:null)||
  (process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:"http://localhost:3000");

const loginError=(message:string):never=>redirect(`/login?error=${encodeURIComponent(message)}`);

export async function login(formData:FormData){
  const s=await createClient();
  const email=String(formData.get("email")||"").trim();
  const password=String(formData.get("password")||"");

  if(!email||!password) loginError("Enter your email and password");

  const {error}=await s.auth.signInWithPassword({email,password});
  if(error){
    const lower=error.message.toLowerCase();
    if(lower.includes("email not confirmed")) loginError("Please verify your email address before signing in.");
    loginError(error.message);
  }

  const {data:userData,error:userError}=await s.auth.getUser();
  const userId=userData.user?.id;
  if(userError||!userId){
    await s.auth.signOut();
    loginError("Unable to start your session. Please try again.");
  }

  const {data:profile,error:profileError}=await s.from("profiles").select("account_status").eq("id",userId).maybeSingle();
  if(profileError){
    await s.auth.signOut();
    loginError("We could not load your account status. Please try again.");
  }

  const accountStatus=profile?.account_status;
  if(!accountStatus){
    await s.auth.signOut();
    loginError("Your account profile is still being prepared. Please try again in a moment.");
  }

  if(accountStatus!=="approved"){
    await s.auth.signOut();
    if(accountStatus==="rejected") redirect("/account-pending?status=rejected");
    redirect("/account-pending?stage=review");
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

  // Never leave a newly created account with an active browser session.
  if(data.session) await s.auth.signOut();
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
