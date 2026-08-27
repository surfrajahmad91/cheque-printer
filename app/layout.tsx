import "./globals.css";
import "./theme.css";
import "./premium.css";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "⌂" },
  { href: "/cheques", label: "Register", icon: "▤" },
  { href: "/templates", label: "Templates", icon: "◇" },
  { href: "/payees", label: "Payees", icon: "◎" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <div className="shell">
          {user ? (
            <header className="topbar">
              <Link className="brand" href="/dashboard" aria-label="Cheque Printing home">
                Cheque Printing
              </Link>
              <nav className="nav" aria-label="Primary navigation">
                {navItems.map((item) => (
                  <Link href={item.href} key={item.href}>
                    <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
              <LogoutButton />
            </header>
          ) : null}
          {children}
        </div>
      </body>
    </html>
  );
}
