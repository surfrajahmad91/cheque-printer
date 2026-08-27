import {updatePassword} from "../actions";
import Link from "next/link";

export default async function ResetPassword({searchParams}:{searchParams:Promise<{error?:string}>}){
  const {error}=await searchParams;
  return <main className="public-page"><div className="auth-shell"><Link className="public-brand auth-brand" href="/"><span className="public-brand-mark">✓</span><span>Cheque<span>Flow</span></span></Link><section className="auth-card modern-auth"><div className="auth-kicker">SECURE ACCOUNT</div><h1>Choose a new password.</h1><p className="auth-intro">Set a new password for your ChequeFlow account.</p>{error&&<div role="alert" className="error-message">{error}</div>}<form action={updatePassword}><div className="field"><label htmlFor="new-password">New password</label><input id="new-password" name="password" type="password" required minLength={6} autoComplete="new-password" placeholder="At least 6 characters"/></div><div className="field"><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" name="confirmPassword" type="password" required minLength={6} autoComplete="new-password" placeholder="Enter it again"/></div><button className="btn auth-submit">Update password <span>→</span></button></form><p className="auth-switch"><Link href="/login">← Back to sign in</Link></p></section></div></main>;
}
