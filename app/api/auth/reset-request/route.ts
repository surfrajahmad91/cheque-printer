import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim();

    if (!email) {
      return NextResponse.json({error: "Enter your email address."}, {status: 400});
    }

    const supabase = await createClient();
    const origin = new URL(request.url).origin;
    const {error} = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?type=recovery`,
    });

    if (error) {
      return NextResponse.json({error: error.message}, {status: 400});
    }

    return NextResponse.json({ok: true});
  } catch {
    return NextResponse.json({error: "Unable to send the reset link right now. Please try again."}, {status: 500});
  }
}
