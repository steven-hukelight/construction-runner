"use client";

import { useState } from "react";

export default function SignupVerifyForm({
  email,
  registrationId,
  initialMessage,
  onVerified,
  onBack,
}: {
  email: string;
  registrationId?: string | null;
  initialMessage?: string;
  onVerified: (message: string) => void;
  onBack?: () => void;
}) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/register/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: registrationId || undefined,
          email,
          code,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        onVerified(
          json.message || "Email verified. Your account request is pending approval."
        );
        return;
      }
      setMessage(json?.error || "Verification failed");
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/register/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: registrationId || undefined,
          email,
        }),
      });
      const json = await res.json().catch(() => ({}));
      setMessage(res.ok ? "New code sent, check your inbox." : json?.error || "Could not resend");
    } catch {
      setMessage("Network error");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold text-blue-700 mb-2">Verify your email</h1>
      <p className="text-sm text-gray-600 mb-6">
        Enter the 6-digit code we sent to <strong className="text-gray-800">{email}</strong>, or open the
        verification link in that email. After that, an administrator still needs to approve your account.
      </p>
      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Verification code</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="000000"
            className="border border-gray-300 rounded-lg p-3 w-full text-center text-2xl tracking-[0.4em] font-semibold focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="bg-blue-600 text-white py-2.5 px-4 rounded-lg w-full font-semibold shadow hover:bg-blue-700 disabled:bg-gray-300"
        >
          {loading ? "Verifying…" : "Verify email"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => void handleResend()}
        disabled={resendLoading}
        className="mt-4 w-full text-sm text-blue-600 hover:underline disabled:text-gray-400"
      >
        {resendLoading ? "Sending…" : "Resend code"}
      </button>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-2 w-full text-sm text-gray-500 hover:text-blue-600"
        >
          Back
        </button>
      )}
      {message && <p className="text-sm text-center text-blue-700 mt-4 font-medium">{message}</p>}
    </div>
  );
}
