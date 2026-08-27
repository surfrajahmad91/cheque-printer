"use client";

import Link from "next/link";
import {FormEvent, useState} from "react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email: email.trim()}),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus("error");
        setMessage(data.error || "Unable to send the reset link right now.");
        return;
      }
      setStatus("sent");
      setMessage("If an account exists for that email, a password-reset email has been sent. Check your inbox and spam folder.");
    } catch {
      setStatus("error");
      setMessage("Unable to connect to the server. Please try again.");
    }
  }

  return (
    <main className="main">
      <div className="auth-card">
        <h1>Reset password</h1>
        <p className="muted">Enter your account email and we'll send you a secure password-reset link.</p>
        {status === "error" && <div role="alert" className="error-message">{message}</div>}
        {status === "sent" && <div role="status" className="success-message">{message}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="reset-email">Email</label>
            <input id="reset-email" name="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={status === "sending"} />
          </div>
          <button className="btn" style={{width: "100%"}} type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <p className="muted"><Link href="/login">Back to sign in</Link></p>
      </div>
    </main>
  );
}
