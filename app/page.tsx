import Link from "next/link";
import {PublicHeader} from "@/components/public-header";

const features=[
  ["01","Precise printing","Calibrate every cheque field once and keep the layout ready for repeat printing."],
  ["02","Reusable payees","Save payee details once and bring them into new cheques without retyping."],
  ["03","Printer-ready workflow","Keep drafts, print history, cheque series and printer profiles organised."],
  ["04","Private workspace","Your cheque records stay isolated to your account with database-level access controls."],
];

export default function Home(){
  return <main className="landing">
    <PublicHeader/>
    <section className="hero">
      <div className="hero-copy">
        <div className="hero-kicker"><span>CHEQUE WORKSPACE</span><i/> Built for precise printing</div>
        <h1>Cheque printing, <em>without the guesswork.</em></h1>
        <p className="hero-lead">A focused workspace for preparing, calibrating, managing and printing cheques with confidence — designed desktop-first for real office printers.</p>
        <div className="hero-actions"><Link className="btn btn-lg" href="/signup">Create your account <span>→</span></Link><Link className="hero-secondary" href="#workflow">See how it works <span>↓</span></Link></div>
        <div className="hero-proof"><span><b>✓</b> Calibration-first</span><span><b>✓</b> Reusable records</span><span><b>✓</b> Review before access</span></div>
      </div>
      <div className="hero-visual" aria-label="ChequeFlow workspace preview">
        <div className="visual-glow"/>
        <div className="window-card">
          <div className="window-top"><div className="window-dots"><i/><i/><i/></div><span>ChequeFlow · New cheque</span><b>Ready</b></div>
          <div className="window-body">
            <aside><div className="mini-brand"><span>✓</span> ChequeFlow</div><div className="mini-nav active">⌂ Dashboard</div><div className="mini-nav">▤ Register</div><div className="mini-nav">◇ Templates</div><div className="mini-nav">◎ Payees</div><div className="mini-nav">⚙ Settings</div></aside>
            <div className="mini-content"><div className="mini-title"><div><small>CHEQUE WORKSPACE</small><h3>Prepare your cheque</h3></div><button>Save draft</button></div><div className="mini-fields"><div/><div/><div className="wide"/></div><div className="mini-cheque"><span className="mini-payee">ABC TRADERS</span><span className="mini-amount">₹ 1,36,459.00</span><span className="mini-line"/></div><div className="mini-footer"><span>Calibration locked</span><strong>Print cheque →</strong></div></div>
          </div>
        </div>
      </div>
    </section>

    <section className="trust-strip"><div><strong>Designed for office workflows</strong><span>Start simple. Add more business services later.</span></div><div className="trust-items"><span>Desktop-first</span><span>Responsive</span><span>Secure by default</span></div></section>

    <section className="feature-section" id="features"><div className="section-intro"><span className="section-number">WHY CHEQUEFLOW</span><h2>Everything important,<br/><em>kept in its place.</em></h2><p>No cluttered accounting-suite interface. Just a thoughtful workspace that makes cheque preparation feel predictable.</p></div><div className="feature-grid">{features.map(([n,title,copy])=><article className="feature-card" key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p><b>Explore →</b></article>)}</div></section>

    <section className="workflow-section" id="workflow"><div className="workflow-head"><span className="section-number">A SIMPLE FLOW</span><h2>From blank cheque to <em>ready to print.</em></h2></div><div className="workflow-grid"><div><span>01</span><h3>Create</h3><p>Enter the cheque details once. Use saved payees and templates whenever possible.</p></div><div><span>02</span><h3>Calibrate</h3><p>Position every printed field precisely for your cheque book and printer.</p></div><div><span>03</span><h3>Review</h3><p>Keep a clean register of drafts, printed cheques and reprints before the final step.</p></div><div><span>04</span><h3>Print</h3><p>Use your calibrated profile and print with the confidence that the layout is ready.</p></div></div></section>

    <section className="security-section"><div><span className="section-number">CONTROLLED ACCESS</span><h2>Your account is reviewed<br/><em>before workspace access.</em></h2><p>Sign up, verify your email and we review the account. Approved users then get access to the cheque workspace. This keeps the working database focused on genuine users from day one.</p></div><div className="approval-card"><div className="approval-icon">✓</div><strong>Typical review window</strong><b>Within 4 working hours</b><span>You'll receive the next step once your account is approved.</span></div></section>

    <section className="landing-cta"><div><span>READY WHEN YOU ARE</span><h2>Make cheque printing<br/>feel like a proper product.</h2></div><Link className="btn btn-lg" href="/signup">Create an account →</Link></section>
    <footer className="landing-footer"><span>© {new Date().getFullYear()} ChequeFlow</span><span>Precise. Organised. Printer-ready.</span></footer>
  </main>;
}
