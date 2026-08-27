import {requestPasswordReset} from "../actions";
import Link from "next/link";

export default async function ForgotPassword({searchParams}:{searchParams:Promise<{error?:string;sent?:string}>}){
  const {error,sent}=await searchParams;
  return <main className="main"><div className="auth-card"><h1>Reset password</h1><p className="muted">Enter your account email and we'll send you a secure password-reset link.</p>{error&&<div role="alert" className="error-message">{error}</div>}{sent&&<div role="status" className="success-message">If an account exists for that email, a password-reset email has been sent. Check your inbox and spam folder.</div>}<form action={requestPasswordReset}><div className="field"><label>Email</label><input name="email" type="email" required autoComplete="email"/></div><button className="btn" style={{width:"100%"}}>Send reset link</button></form><p className="muted"><Link href="/login">Back to sign in</Link></p></div></main>;
}
