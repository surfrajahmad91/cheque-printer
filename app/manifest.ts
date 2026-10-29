import type {MetadataRoute} from "next";

export default function manifest():MetadataRoute.Manifest{
  return {
    name:"ChequeFlow — Precise Cheque Printing",
    short_name:"ChequeFlow",
    description:"Prepare, calibrate, manage and print cheques.",
    start_url:"/dashboard",
    display:"standalone",
    background_color:"#f4f6f5",
    theme_color:"#0a1a16",
    icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any"}],
  };
}
