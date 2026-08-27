import "./globals.css";
import "./theme.css";
import "./premium.css";
import "./polish.css";
import "./final-overrides.css";
import Link from "next/link";
import type {Metadata} from "next";
import {createClient} from "@/lib/supabase/server";
import {LogoutButton} from "@/components/logout-button";

export const metadata: Metadata = {
  title: "ChequeFlow — Precise Cheque Printing",
  description: "A professional workspace for preparing, calibrating, managing and printing cheques.",
};

const navItems = [
  {href:"/dashboard",label:"Dashboard",icon:"⌂"},
  {href:"/cheques",label:"Register",icon:"▤"},
  {href:"/templates",label:"Templates",icon:"◇"},
  {href:"/payees",label:"Payees",icon:"◎"},
  {href:"/settings",label:"Settings",icon:"⚙"},
];

function Navigation({mobile=false}:{mobile?:boolean}) {
  return <>
    {navItems.map(item => <Link href={item.href} key={item.href}>
      <span className="nav-icon" aria-hidden="true">{item.icon}</span>
      <span>{item.label}</span>
    </Link>)}
    <Link className={mobile ? "mobile-admin-link" : "topbar-admin"} href="/admin/users">Admin</Link>
  </>;
}

export default async function RootLayout({children}:{children:React.ReactNode}){
  const supabase=await createClient();
  const {data:claimsData}=await supabase.auth.getClaims();
  const user=claimsData?.claims;
  return <html lang="en"><body><div className="shell">
    {user ? <header className="topbar">
      <Link className="brand" href="/dashboard" aria-label="ChequeFlow home"><span className="brand-mark">✓</span><span>Cheque<span className="brand-accent">Flow</span></span></Link>
      <nav className="nav" aria-label="Primary navigation"><Navigation/></nav>
      <details className="mobile-nav">
        <summary aria-label="Open navigation">Menu</summary>
        <div className="mobile-nav-panel">
          <nav aria-label="Mobile navigation"><Navigation mobile/></nav>
          <LogoutButton />
        </div>
      </details>
      <LogoutButton />
    </header> : null}
    {children}
  </div></body></html>;
}
