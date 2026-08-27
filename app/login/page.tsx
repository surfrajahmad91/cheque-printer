import {login} from "../actions";
import Link from "next/link";
import LoginForm from "./login-form";

export default async function Login({searchParams}:{searchParams:Promise<{error?:string;success?:string}>}){
  const {error,success}=await searchParams;
  return <main className="public-page"><div className="auth-shell"><Link className="public-brand auth-brand" href="/"><span className="public-brand-mark">✓</span><span>Cheque<span>Flow</span></span></Link><section className="auth-card modern-auth"><div className="auth-kicker">WELCOME BACK</div><h1>Sign in to your workspace.</h1><p className="auth-intro">Access your cheque register, templates, payees and printer-ready workflow.</p>{error&&<div role="alert" className="error-message">{error}</div>}{success&&<div role="status" className="success-message">{success}</div>}<LoginForm action={login}><div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" required autoComplete="email" placeholder="you@company.com"/></div><div className="field"><div className="field-label-row"><label htmlFor="password">Password</label><Link href="/forgot-password">Forgot password?</Link></div><input id="password" name="password" type="password" required autoComplete="current-password" placeholder="Enter your password"/></div></LoginForm><div className="auth-divider"><span>New to ChequeFlow?</span></div><Link className="auth-alt-action" href="/signup">Create your account</Link></section><p className="auth-legal">Accounts are reviewed before workspace access is granted.</p></div></main>;
}
