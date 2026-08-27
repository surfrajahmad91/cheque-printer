import {createClient} from "@/lib/supabase/server";
import {NextResponse} from "next/server";

export async function GET(request:Request){
  const url=new URL(request.url);
  const code=url.searchParams.get("code");
  const type=url.searchParams.get("type");
  if(code){
    const s=await createClient();
    const {error}=await s.auth.exchangeCodeForSession(code);
    if(error)return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`,url.origin));
  }
  return NextResponse.redirect(new URL(type==="recovery"?"/reset-password":"/dashboard",url.origin));
}
