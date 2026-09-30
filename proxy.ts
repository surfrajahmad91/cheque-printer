import {createServerClient} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";

export async function proxy(request:NextRequest){
  const pathname=request.nextUrl.pathname;
  const protectedPath=["/dashboard","/cheques","/templates","/payees","/settings","/designer","/admin"].some((path)=>pathname.startsWith(path));

  // Public pages should not wait for Supabase. This keeps login/signup and
  // other public UI responsive even while the auth service is unavailable.
  if(!protectedPath){
    return NextResponse.next();
  }

  let response=NextResponse.next({request});
  const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll(){return request.cookies.getAll()},setAll(cookiesToSet){cookiesToSet.forEach(({name,value,options})=>request.cookies.set(name,value));response=NextResponse.next({request});cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}});
  const {data}=await supabase.auth.getClaims();

  if(!data?.claims){
    const url=request.nextUrl.clone();
    url.pathname="/login";
    return NextResponse.redirect(url);
  }

  const userId=data.claims.sub as string;
  const {data:profile}=await supabase.from("profiles").select("account_status").eq("id",userId).maybeSingle();

  if(profile?.account_status!=="approved"){
    const url=request.nextUrl.clone();
    url.pathname="/account-pending";
    url.search=`status=${encodeURIComponent(profile?.account_status||"pending")}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]};
