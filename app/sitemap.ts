import type {MetadataRoute} from "next";

export default function sitemap():MetadataRoute.Sitemap{
  const base=process.env.NEXT_PUBLIC_SITE_URL||"https://cheque-printer-five.vercel.app";
  const now=new Date();
  return [{path:"",p:1},{path:"/login",p:.6},{path:"/signup",p:.8},{path:"/privacy",p:.3},{path:"/terms",p:.3}].map(({path,p})=>({url:`${base}${path}`,lastModified:now,changeFrequency:"monthly" as const,priority:p}));
}
