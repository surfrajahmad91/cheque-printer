// Dates in the app are shown in Indian Standard Time, regardless of where the page is rendered.
const IST="Asia/Kolkata";
export function fmtDateTimeIST(value:string|number|Date|null|undefined){
  if(!value)return "—";
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return "—";
  return d.toLocaleString("en-IN",{timeZone:IST,day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:true});
}
// DD MMM YYYY for a plain ISO date (YYYY-MM-DD) without any timezone shifting.
export function fmtDateIN(iso:string|null|undefined){
  if(!iso)return "—";
  const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if(!m)return iso;
  const mon=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(m[2])-1];
  return `${m[3]} ${mon} ${m[1]}`;
}
