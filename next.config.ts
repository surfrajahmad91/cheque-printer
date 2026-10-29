import type {NextConfig} from "next";

const config:NextConfig={
  poweredByHeader:false,
  async headers(){
    return [{
      source:"/:path*",
      headers:[
        {key:"X-Content-Type-Options",value:"nosniff"},
        // SAMEORIGIN (not DENY): the cheque designer runs in an iframe served from this same origin.
        {key:"X-Frame-Options",value:"SAMEORIGIN"},
        {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
        {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},
        {key:"Strict-Transport-Security",value:"max-age=63072000; includeSubDomains"},
      ],
    }];
  },
};

export default config;
