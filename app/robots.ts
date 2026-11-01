import type {MetadataRoute} from "next";

export default function robots():MetadataRoute.Robots{
  const base=process.env.NEXT_PUBLIC_SITE_URL||"https://cheque-printer-five.vercel.app";
  return {
    rules:[{userAgent:"*",allow:["/"],disallow:["/dashboard","/cheques","/designer","/payees","/templates","/settings","/admin","/api","/account-pending","/reset-password","/forgot-password","/register","/design"]}],
    sitemap:`${base}/sitemap.xml`,
  };
}
