"use client";

import {useFormStatus} from "react-dom";
import type {ReactNode} from "react";

function SubmitButton(){
  const {pending}=useFormStatus();
  return <button className="btn auth-submit" type="submit" disabled={pending}>{pending?"Signing in…":"Sign in"} <span>{pending?"":"→"}</span></button>;
}

export default function LoginForm({action,children}:{action:(formData:FormData)=>void;children:ReactNode}){
  return <form action={action}>{children}<SubmitButton/></form>;
}
