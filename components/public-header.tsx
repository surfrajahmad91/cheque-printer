import Link from "next/link";

export function PublicHeader(){
  return <header className="public-header">
    <Link className="public-brand" href="/" aria-label="ChequeFlow home"><span className="public-brand-mark">✓</span><span>Cheque<span>Flow</span></span></Link>
    <nav className="public-nav" aria-label="Public navigation">
      <a href="#features">Features</a><a href="#workflow">How it works</a>
    </nav>
    <div className="public-actions"><Link className="public-login" href="/login">Sign in</Link><Link className="btn" href="/signup">Create account</Link></div>
  </header>;
}
