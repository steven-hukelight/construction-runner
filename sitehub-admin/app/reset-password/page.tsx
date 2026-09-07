"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Suspense } from "react";

function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasValidLink, setHasValidLink] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function run() {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash || "";
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const errorCode = hashParams.get("error_code");
      const hasRecoveryHash = hash.includes("type=recovery") || hash.includes("access_token");

      // Supabase error in hash (e.g. otp_expired)
      if (errorCode || hashParams.get("error")) {
        setError("Reset link expired or invalid. Request a new one.");
        setReady(true);
        return;
      }

      // PKCE: exchange code for session (same-browser only)
      if (code) {
        const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
        if (!mounted) return;
        if (exchangeErr) {
          setError("Reset link expired or invalid. Request a new one.");
          setReady(true);
          return;
        }
        if (data?.session) {
          window.history.replaceState({}, "", window.location.pathname);
          setHasValidLink(true);
          setReady(true);
          return;
        }
      }

      // token_hash: verify OTP directly (admin-generated links)
      if (tokenHash) {
        const { data, error: verifyErr } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (!mounted) return;
        if (verifyErr) {
          setError("Reset link expired or invalid. Request a new one.");
          setReady(true);
          return;
        }
        if (data?.session) {
          window.history.replaceState({}, "", window.location.pathname);
          setHasValidLink(true);
          setReady(true);
          return;
        }
      }

      // Implicit flow: tokens in hash — detectSessionInUrl processes async
      if (hasRecoveryHash) {
        await new Promise((r) => setTimeout(r, 800)); // Let detectSessionInUrl run
        if (!mounted) return;
        const { data: { session: s1 } } = await supabase.auth.getSession();
        if (s1) {
          window.history.replaceState({}, "", window.location.pathname);
          setHasValidLink(true);
          setError("");
          setReady(true);
          return;
        }
        // Fallback: listen for PASSWORD_RECOVERY event
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (!mounted) return;
          if (event === "PASSWORD_RECOVERY" || event === "INITIAL_SESSION") {
            setHasValidLink(true);
            setError("");
            setReady(true);
            subscription.unsubscribe();
          }
        });
        await new Promise((r) => setTimeout(r, 1200));
        if (!mounted) return;
        const { data: { session: s2 } } = await supabase.auth.getSession();
        subscription.unsubscribe();
        if (s2) {
          setHasValidLink(true);
          setReady(true);
        } else {
          setError("Reset link expired or invalid. Request a new one.");
        }
        setReady(true);
        return;
      }

      // No recovery params — check for existing session (e.g. from callback redirect)
      const { data: { session: s3 } } = await supabase.auth.getSession();
      if (s3) {
        setHasValidLink(true);
        setReady(true);
        return;
      }

      setError("Invalid or missing reset link. Request a new one from the forgot password page.");
      setReady(true);
    }

    run();
    return () => { mounted = false; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });

      if (err) {
        setError(err.message);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.replace("/admin/login"), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const showForm = ready && (hasValidLink || success);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">Reset Password</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-600">
            {error}
            {(error.includes("Invalid or missing") || error.includes("expired")) && (
              <Link href="/forgot-password" className="block mt-2 text-blue-600 hover:underline">
                Request a new link →
              </Link>
            )}
          </div>
        )}

        {!ready && !error && (
          <div className="text-center text-gray-500 py-4">Verifying reset link…</div>
        )}

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center text-green-700">
            Password reset! Redirecting to login…
          </div>
        ) : (
          showForm && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>

              <Link href="/admin/login" className="block w-full text-center text-sm text-gray-600 hover:text-gray-900 py-2">
                ← Back to sign in
              </Link>
            </form>
          )
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordPage />
    </Suspense>
  );
}
