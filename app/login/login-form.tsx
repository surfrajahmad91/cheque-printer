"use client";

import {useFormStatus} from "react-dom";
import type {ReactNode} from "react";

export default function LoginForm({action,children}:{action:(formData:FormData)=>void;children:ReactNode}){
  const {pending}=useFormStatus();
  return <form action={action}>{children}<button className="btn auth-submit" type="submit" disabled={pending}>{pending?"Signing in…":"Sign in"} <span>{pending?"":"→"}</span></button></form>;
}
