"use client";

import {useState} from "react";
import Link from "next/link";
import {LogoutButton} from "@/components/logout-button";

const navItems = [
  {href:"/dashboard",label:"Dashboard",icon:"⌂"},
  {href:"/cheques",label:"Register",icon:"▤"},
  {href:"/templates",label:"Templates",icon:"◇"},
  {href:"/payees",label:"Payees",icon:"◎"},
  {href:"/settings",label:"Settings",icon:"⚙"},
];

export function MobileNavigation({isAdmin}:{isAdmin:boolean}) {
  const [open,setOpen]=useState(false);
  const close=()=>setOpen(false);

  return <details className="mobile-nav" open={open} onToggle={(event)=>setOpen(event.currentTarget.open)}>
    <summary aria-label="Open navigation">Menu</summary>
    <div className="mobile-nav-panel">
      <nav aria-label="Mobile navigation">
        {navItems.map(item => <Link href={item.href} key={item.href} onClick={close}>
          <span className="nav-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </Link>)}
        {isAdmin ? <Link className="mobile-admin-link" href="/admin/users" onClick={close}>Admin</Link> : null}
      </nav>
      <LogoutButton />
    </div>
  </details>;
}
