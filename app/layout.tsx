import "./globals.css";
import "./theme.css";
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
              <a className="brand" href="/dashboard" aria-label="Cheque Printing home">
                Cheque Printing
              </a>
              <nav className="nav" aria-label="Primary navigation">
                {navItems.map((item) => (
                  <a href={item.href} key={item.href}>
                    <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
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
