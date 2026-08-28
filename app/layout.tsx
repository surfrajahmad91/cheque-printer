import "./globals.css";
import "./theme.css";
import "./premium.css";
import "./polish.css";
import "./final-overrides.css";
import "./design-polish.css";
import "./visual-system-fix.css";
import Link from "next/link";
import type {Metadata} from "next";
import {createClient} from "@/lib/supabase/server";
import {LogoutButton} from "@/components/logout-button";
import {MobileNavigation} from "@/components/mobile-navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ChequeFlow — Precise Cheque Printing",
  description: "A professional workspace for preparing, calibrating, managing and printing cheques.",
};

const ADMIN_EMAIL = "surfrajahmad@gmail.com";

const navItems = [
  {href:"/dashboard",label:"Dashboard",icon:"⌂"},
  {href:"/cheques",label:"Register",icon:"▤"},
  {href:"/templates",label:"Templates",icon:"◇"},
  {href:"/payees",label:"Payees",icon:"◎"},
  {href:"/settings",label:"Settings",icon:"⚙"},
];

function Navigation({isAdmin=false}:{isAdmin?:boolean}) {
  return <>
    {navItems.map(item => <Link href={item.href} key={item.href}>
      <span className="nav-icon" aria-hidden="true">{item.icon}</span>
      <span>{item.label}</span>
    </Link>)}
    {isAdmin ? <Link className="topbar-admin" href="/admin/users">Admin</Link> : null}
  </>;
}

export default async function RootLayout({children}:{children:React.ReactNode}){
  const supabase=await createClient();
  const {data:claimsData}=await supabase.auth.getClaims();
  const user=claimsData?.claims;
  const email=typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
  const isAdmin=email===ADMIN_EMAIL;
  return <html lang="en"><body><div className="shell">
    {user ? <header className="topbar">
      <Link className="brand" href="/dashboard" aria-label="ChequeFlow home"><span className="brand-mark">✓</span><span>Cheque<span className="brand-accent">Flow</span></span></Link>
      <nav className="nav" aria-label="Primary navigation"><Navigation isAdmin={isAdmin}/></nav>
      <MobileNavigation isAdmin={isAdmin}/>
      <LogoutButton />
    </header> : null}
    {children}
  </div></body></html>;
}
