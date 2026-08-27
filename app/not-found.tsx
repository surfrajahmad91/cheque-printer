import Link from "next/link";

export default function NotFound(){
  return <main className="main"><div className="card"><h1>Page not found</h1><p className="muted">The page you requested does not exist.</p><Link className="btn" href="/dashboard">Back to dashboard</Link></div></main>;
}
