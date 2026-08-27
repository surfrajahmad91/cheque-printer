import {createClient} from "@/lib/supabase/server";
import {NextResponse} from "next/server";

export async function GET(request:Request){
  const url=new URL(request.url);
  const code=url.searchParams.get("code");
  const type=url.searchParams.get("type");
  const error=url.searchParams.get("error");
  const errorDescription=url.searchParams.get("error_description");

  if(error){
    const message=errorDescription||error;
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`,url.origin));
  }

  if(code){
    const s=await createClient();
    const {error:exchangeError}=await s.auth.exchangeCodeForSession(code);
    if(exchangeError){
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`,url.origin));
    }

    if(type==="recovery"){
      return NextResponse.redirect(new URL("/reset-password",url.origin));
    }

    // Email verification must never grant workspace access by itself.
    // End the temporary verification session and send the user to sign in.
    await s.auth.signOut();
    return NextResponse.redirect(new URL(
      "/login?success=Email%20verified%20successfully.%20Your%20account%20is%20now%20under%20review.%20We%20expect%20to%20review%20it%20within%204%20working%20hours.",
      url.origin
    ));
  }

  return NextResponse.redirect(new URL(
    type==="recovery"?"/reset-password":"/login?error=The%20verification%20link%20is%20missing%20or%20invalid.",
    url.origin
  ));
}
