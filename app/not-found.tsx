import Link from "next/link";

export const metadata = { title: "Page not found", robots: { index: false, follow: false } };

export default function NotFound(){
  return <main className="nf"><div className="nf-card">
    <div className="nf-code" aria-hidden="true">404</div>
    <span className="eyebrow">PAGE NOT FOUND</span>
    <h1>This page took a wrong turn.</h1>
    <p>The link may be old or mistyped. Your cheques and templates are safe — let’s get you back on track.</p>
    <div className="nf-actions"><Link className="btn" href="/dashboard">Go to dashboard</Link><Link className="btn ghost" href="/">Back to home</Link></div>
  </div></main>;
}
