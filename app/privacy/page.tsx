import Link from "next/link";

export const metadata={title:"Privacy Policy"};
const contact=process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export default function Privacy(){
  return <main className="main legal"><Link className="text-link" href="/">← Back to ChequeFlow</Link>
    <article className="card">
      <span className="eyebrow">LEGAL</span><h1>Privacy Policy</h1><p className="muted">Last updated: October 2026</p>
      <h2>What we collect</h2>
      <p>Your name and email address when you create an account, and the data you enter to use the service: payee details, cheque details (date, payee, amount, cheque number, notes), cheque layouts and templates, and print history. Optional calibration images you upload are stored privately in your account.</p>
      <h2>How we use it</h2>
      <p>Only to provide ChequeFlow: to sign you in, save and print your cheques, and keep your register. We do not sell your data and do not use it for advertising.</p>
      <h2>Who can see it</h2>
      <p>Your records are isolated to your account using database-level access controls. The administrator can see account details (name, email, status) in order to approve access, but not your cheque register contents through the app.</p>
      <h2>Where it is stored</h2>
      <p>Data is stored with our infrastructure providers (Supabase for database and authentication, Vercel for hosting). These providers process data on our behalf.</p>
      <h2>Your choices</h2>
      <p>You can edit or delete your payees, templates and cheques at any time. To delete your account and associated data, contact us{contact?<> at <a href={`mailto:${contact}`}>{contact}</a></>:<> using the email address you registered with</>}.</p>
      <h2>Security</h2>
      <p>Connections are encrypted, passwords are never stored in readable form, and access is limited to approved accounts. No system is perfectly secure; please use a strong, unique password.</p>
      <p className="muted">This policy may be updated from time to time. Continued use of the service means you accept the updated policy.</p>
    </article></main>;
}
