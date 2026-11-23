"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { setUserCookies } from "@/app/login/actions";
import AuthShell from "@/app/components/auth/AuthShell";
import FeedbackLink from "@/app/components/FeedbackLink";
import { getAuthRedirectOrigin } from "@/lib/url";
import { dashboardHomeForRole } from "@/lib/auth/dashboardHome";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";
import { LanguageSwitcher } from "@/app/components/LanguageSwitcher";
import { LegalConsentLinks } from "@/app/components/LegalConsentLinks";
import SignupVerifyForm from "@/app/components/SignupVerifyForm";

function LoginPageContent() {
  const { t } = useDisplayPreferences();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [inviteHint, setInviteHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyRegistrationId, setVerifyRegistrationId] = useState<string | null>(null);
  const [verifyDoneMessage, setVerifyDoneMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const blocked = searchParams.get("blocked");
    const err = searchParams.get("error");
    const timeout = searchParams.get("timeout");
    const expired = searchParams.get("expired");
    const emailParam = searchParams.get("email")?.trim();
    if (emailParam) setEmail(emailParam);
    setInviteHint(searchParams.get("from") === "invite");
    if (blocked === "operative") {
      setError("Operative web login is a future feature. Please use the mobile app.");
    } else if (expired === "1") {
      setError("Your session has expired. Please sign in again.");
    } else if (timeout === "1") {
      setError("Your session ended due to inactivity. Please sign in again.");
    } else if (err) {
      setError(decodeURIComponent(err).replace(/\+/g, " "));
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession()
      .then(({ error }) => {
        if (cancelled) return;
        if (error) {
          // Invalid refresh token etc – clear stale session
          supabase.auth.signOut({ scope: "local" }).catch(() => {});
        }
      })
      .catch(() => {
        // Avoid unhandled rejection (e.g. invalid refresh token)
        if (!cancelled) supabase.auth.signOut({ scope: "local" }).catch(() => {});
      });
    return () => { cancelled = true; };
  }, []);

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);
       const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getAuthRedirectOrigin()}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const notConfirmed = /email not confirmed/i.test(error.message);
        if (notConfirmed) {
          setVerifyEmail(email.trim().toLowerCase());
          setError("");
          return;
        }
        setError(error.message);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        setError("Sign in succeeded but no session. Please try again.");
        return;
      }
      const result = await setUserCookies(session.user.email, rememberMe, session.user.id);
      if (!result.role) {
        await supabase.auth.signOut({ scope: "local" });
        if ("pendingApproval" in result && result.pendingApproval) {
          setError(
            "Your account is pending approval. An administrator must approve it before you can sign in."
          );
        } else {
          setError(
            result.restricted === "operative"
              ? "Operative web login is a future feature. Please use the mobile app."
              : "Your account is not yet set up. Please contact your administrator."
          );
        }
        setLoading(false);
        return;
      }
      router.push(dashboardHomeForRole(result.role));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes("Supabase") || msg.includes("NEXT_PUBLIC_")
          ? "Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the dev server."
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  const title = verifyDoneMessage
    ? t("Email verified")
    : verifyEmail
      ? t("Verify your email")
      : t("Sign in");

  return (
    <AuthShell
      title={title}
      subtitle="Construction Runner"
      footer={
        <>
          <LanguageSwitcher compact className="min-w-[12rem]" />
          <FeedbackLink variant="landing" />
        </>
      }
    >
      {verifyDoneMessage ? (
        <div className="text-center">
          <p className="mb-6 text-sm text-gray-700">{verifyDoneMessage}</p>
          <button
            type="button"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white transition-colors duration-[120ms] hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={() => {
              setVerifyDoneMessage(null);
              setVerifyEmail("");
            }}
          >
            {t("Back to sign in")}
          </button>
        </div>
      ) : verifyEmail ? (
        <SignupVerifyForm
          email={verifyEmail}
          registrationId={verifyRegistrationId}
          onVerified={(message) => {
            setVerifyDoneMessage(message);
            setVerifyEmail("");
            setVerifyRegistrationId(null);
          }}
          onBack={() => {
            setVerifyEmail("");
            setVerifyRegistrationId(null);
          }}
        />
      ) : (
        <>
          {inviteHint && !error && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-sm text-blue-800">
                If you just joined, set your password from the email we sent (or Forgot password), then sign in.
              </p>
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600" data-testid="login-error">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                {t("Email")}
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                {t("Password")}
              </label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {t("Show password")}
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {t("Remember me")}
              </label>
            </div>
            <div className="flex items-center justify-between text-sm">
              <Link
                href="/forgot-password"
                className="text-gray-700 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {t("Forgot password?")}
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-colors duration-[120ms] hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? t("Signing in...") : t("Sign in")}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 font-medium text-gray-800 transition-colors duration-[120ms] hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t("Sign in with Google")}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            {t("Don't have an account?")}{" "}
            <Link href="/register" className="font-medium text-gray-900 hover:underline">
              {t("Create account")}
            </Link>
          </p>
          <LegalConsentLinks className="mt-4 text-center text-xs text-gray-500" />
        </>
      )}
    </AuthShell>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-1 items-center justify-center bg-[#f3f7fb]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
