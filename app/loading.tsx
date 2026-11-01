export default function Loading(){
  return <main className="main" aria-busy="true" aria-live="polite"><span className="sr-only">Loading…</span>
    <div className="pf-skel pf-skel-title" /><div className="pf-skel pf-skel-line" />
    <div className="pf-skel-grid"><div className="pf-skel pf-skel-card" /><div className="pf-skel pf-skel-card" /><div className="pf-skel pf-skel-card" /></div>
    <div className="pf-skel pf-skel-table" />
  </main>;
}
