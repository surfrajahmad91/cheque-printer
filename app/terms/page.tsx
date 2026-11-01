import Link from "next/link";

export const metadata={title:"Terms of Use"};

export default function Terms(){
  return <main className="main legal"><Link className="text-link" href="/">← Back to ChequeFlow</Link>
    <article className="card">
      <span className="eyebrow">LEGAL</span><h1>Terms of Use</h1><p className="muted">Last updated: October 2026</p>
      <h2>The service</h2>
      <p>ChequeFlow helps you prepare, calibrate, manage and print cheques. Accounts are reviewed and approved before access is granted, and access may be withdrawn for misuse.</p>
      <h2>Your responsibility</h2>
      <p>You are responsible for the accuracy of every cheque you print — payee, amount, amount in words and date — and for checking alignment on a test sheet before printing on a real cheque. Printer and paper behaviour vary, so always verify the printed result.</p>
      <h2>Acceptable use</h2>
      <p>Use the service only for cheques you are authorised to issue. Do not use it for fraud, forgery or any unlawful purpose, and do not attempt to disrupt or gain unauthorised access to the service.</p>
      <h2>Availability and liability</h2>
      <p>The service is provided “as is”. We work to keep it reliable but do not guarantee uninterrupted availability, and to the extent permitted by law we are not liable for losses arising from its use, including spoiled cheque leaves or printing errors.</p>
      <h2>Changes</h2>
      <p>We may update these terms from time to time. Continued use after a change means you accept the updated terms.</p>
    </article></main>;
}
