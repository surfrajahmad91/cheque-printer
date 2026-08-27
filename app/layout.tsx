import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
export default async function RootLayout({children}:{children:React.ReactNode}){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();return <html lang="en"><body><div className="shell">{user&&<header className="topbar"><a className="brand" href="/dashboard">Cheque Printing</a><nav className="nav"><a href="/dashboard">Dashboard</a><a href="/cheques">Register</a><a href="/templates">Templates</a><a href="/payees">Payees</a><a href="/settings">Settings</a></nav><LogoutButton/></header>}{children}</div></body></html>}
