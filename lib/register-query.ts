export const PAGE_SIZE=25;
export type RegisterSort="newest"|"oldest"|"amount";
export type RegisterParams={q:string;status:string;sort:RegisterSort;page:number};

const STATUSES=["draft","printed","reprinted","cancelled","void"];
const first=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]:v;

export function parseRegisterParams(raw:Record<string,string|string[]|undefined>):RegisterParams{
  // Strip characters that have meaning inside PostgREST filter strings.
  const q=String(first(raw.q)||"").replace(/[%,()*\\"']/g," ").replace(/\s+/g," ").trim().slice(0,60);
  const st=String(first(raw.status)||"all");
  const so=String(first(raw.sort)||"newest");
  const page=Math.max(1,Math.min(5000,parseInt(String(first(raw.page)||"1"),10)||1));
  return {q,status:STATUSES.includes(st)?st:"all",sort:so==="oldest"||so==="amount"?so:"newest",page};
}

/** Resolves payee matches once, then returns a function that applies the filters to any cheques query. */
export async function buildRegisterFilter(s:any,userId:string,p:RegisterParams){
  let payeeIds:string[]=[];
  if(p.q){
    const {data}=await s.from("payees").select("id").eq("user_id",userId).ilike("name",`%${p.q}%`).limit(200);
    payeeIds=(data||[]).map((r:{id:string})=>r.id);
  }
  return (query:any)=>{
    if(p.status!=="all")query=query.eq("status",p.status);
    if(p.q){
      query=payeeIds.length
        ?query.or(`cheque_number.ilike.%${p.q}%,payee_id.in.(${payeeIds.join(",")})`)
        :query.ilike("cheque_number",`%${p.q}%`);
    }
    return p.sort==="amount"
      ?query.order("amount",{ascending:false}).order("created_at",{ascending:false})
      :query.order("created_at",{ascending:p.sort==="oldest"}).order("id");
  };
}

export function registerHref(p:Partial<RegisterParams>,base="/cheques"){
  const u=new URLSearchParams();
  if(p.q)u.set("q",p.q);
  if(p.status&&p.status!=="all")u.set("status",p.status);
  if(p.sort&&p.sort!=="newest")u.set("sort",p.sort);
  if(p.page&&p.page>1)u.set("page",String(p.page));
  const qs=u.toString();
  return qs?`${base}?${qs}`:base;
}
