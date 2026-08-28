import {createClient} from "@/lib/supabase/server";
import {NextResponse} from "next/server";

export async function GET(request:Request){
  const url=new URL(request.url);
  const code=url.searchParams.get("code");
  const tokenHash=url.searchParams.get("token_hash");
  const type=url.searchParams.get("type");
  const error=url.searchParams.get("error");
  const errorDescription=url.searchParams.get("error_description");

  if(error){
    const message=errorDescription||error;
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`,url.origin));
  }

  const s=await createClient();

  if(tokenHash){
    const otpType=type==="recovery"?"recovery":"email";
    const {error:verifyError}=await s.auth.verifyOtp({token_hash:tokenHash,type:otpType});
    if(verifyError){
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("This verification link is invalid or has expired. Please request a new verification email.")}`,url.origin));
    }

    await s.auth.signOut();
    return NextResponse.redirect(new URL(
      "/login?verified=1&success=Email%20verified%20successfully.%20Your%20account%20is%20now%20under%20review.%20We%20expect%20to%20review%20it%20within%204%20working%20hours.",
      url.origin
    ));
  }

  if(code){
    const {error:exchangeError}=await s.auth.exchangeCodeForSession(code);
    if(exchangeError){
      const lower=exchangeError.message.toLowerCase();
      const message=lower.includes("expired")||lower.includes("invalid")||lower.includes("one-time token")
        ? "This verification link is invalid or has expired. Please request a new verification email."
        : exchangeError.message;
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`,url.origin));
    }

    if(type==="recovery") return NextResponse.redirect(new URL("/reset-password",url.origin));

    // Verification establishes the email only. It must never grant workspace access.
    await s.auth.signOut();
    return NextResponse.redirect(new URL(
      "/login?verified=1&success=Email%20verified%20successfully.%20Your%20account%20is%20now%20under%20review.%20We%20expect%20to%20review%20it%20within%204%20working%20hours.",
      url.origin
    ));
  }

  return NextResponse.redirect(new URL(
    type==="recovery"?"/reset-password":"/login?error=The%20verification%20link%20is%20missing%20or%20invalid.",
    url.origin
  ));
}
