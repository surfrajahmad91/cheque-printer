import {updatePassword} from "../actions";

export default async function ResetPassword({searchParams}:{searchParams:Promise<{error?:string}>}){
  const {error}=await searchParams;
  return <main className="main"><div className="auth-card"><h1>Choose a new password</h1><p className="muted">Set a new password for your cheque register account.</p>{error&&<div role="alert" className="error-message">{error}</div>}<form action={updatePassword}><div className="field"><label>New password</label><input name="password" type="password" required minLength={6} autoComplete="new-password"/></div><div className="field"><label>Confirm new password</label><input name="confirmPassword" type="password" required minLength={6} autoComplete="new-password"/></div><button className="btn" style={{width:"100%"}}>Update password</button></form></div></main>;
}
