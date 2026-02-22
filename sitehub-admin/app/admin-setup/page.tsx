"use client";
import { useState } from "react";

export default function AdminSetupPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendReset() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/send-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (res.ok) {
        setSent(true);
        setMessage("Check your email for a password setup link.");
        // Mark setup as complete after reset link sent
        await fetch("/api/auth/admin-setup-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
      } else {
        setMessage(json?.error || "Failed to send reset email.");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="card p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Admin Account Setup</h1>
        <p className="mb-4">Enter your email to receive a password setup link.</p>
        <input
          type="email"
          className="input w-full mb-4"
          placeholder="Your email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={sent}
        />
        <button
          className="btn btn-primary w-full"
          onClick={handleSendReset}
          disabled={loading || sent || !email}
        >
          {loading ? "Sending..." : sent ? "Sent" : "Send Setup Link"}
        </button>
        {message && <p className="mt-4 text-center text-sm">{message}</p>}
      </div>
    </div>
  );
}
