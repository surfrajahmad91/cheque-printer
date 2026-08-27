import { login } from "../actions";
import Link from "next/link";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="main"><div className="auth-card"><h1>Sign in</h1><p className="muted">Access your cheque register and printing workspace.</p>{error&&<div role="alert" className="error-message">{error}</div>}<form action={login}><div className="field"><label>Email</label><input name="email" type="email" required autoComplete="email"/></div><div className="field"><label>Password</label><input name="password" type="password" required autoComplete="current-password"/></div><button className="btn" style={{width:"100%"}}>Sign in</button></form><p className="muted">New user? <Link href="/signup">Create account</Link></p></div></main>;
}
