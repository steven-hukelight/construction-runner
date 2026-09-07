"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";
import { setUserCookies } from "@/app/login/actions";
import FeedbackLink from "@/app/components/FeedbackLink";
import { getAuthRedirectOrigin } from "@/lib/url";

function LoginPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const blocked = searchParams.get("blocked");
    const err = searchParams.get("error");
    const timeout = searchParams.get("timeout");
    const expired = searchParams.get("expired");
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
      .then(({ data: { session }, error }) => {
        if (cancelled) return;
        if (error) {
          // Invalid refresh token etc – clear stale session
          supabase.auth.signOut({ scope: "local" }).catch(() => {});
          try {
            ["role", "user_email", "companyId", "impersonating", "session_id", "session_started_at"].forEach(
              (name) => (document.cookie = `${name}=; path=/; max-age=0`)
            );
          } catch { /* ignore */ }
          return;
        }
        if (!session) {
          try {
            ["role", "user_email", "companyId", "impersonating", "session_id", "session_started_at"].forEach(
              (name) => (document.cookie = `${name}=; path=/; max-age=0`)
            );
          } catch {
            // document.cookie access denied
          }
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
        setError(
          "pendingApproval" in result && result.pendingApproval
            ? "Your account is pending approval. An administrator must approve it before you can sign in."
            : result.restricted === "operative"
              ? "Operative web login is a future feature. Please use the mobile app."
              : "Your account is not yet set up. Please contact your administrator."
        );
        setLoading(false);
        return;
      }
      router.push("/dashboard");
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

  return (
    <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden">
      {/* Background + light vignette: keeps cyan/blue plexus visible; darkens edges for footer + card separation */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <Image
          src="/login-bg-plexus.png"
          alt=""
          fill
          priority
          unoptimized
          className="object-cover object-center brightness-[0.96] saturate-[0.96]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/45 from-0% via-slate-900/10 via-45% to-slate-950/65 to-100%" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/20 via-transparent to-amber-950/15" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-[0_28px_90px_-16px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/[0.06]">
              <div className="text-center mb-6">
            <div className="w-28 h-28 mx-auto mb-4 flex items-center justify-center">
              <Image src="/icon.png" alt="Construction Runner" width={112} height={112} className="object-contain" priority />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Sign In</h1>
            <p className="text-sm text-slate-500 mt-1">Construction Runner Admin</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                  <p className="text-sm text-red-600" data-testid="login-error">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/80 focus:border-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/80 focus:border-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                Show password
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                Remember me
              </label>
            </div>
            <div className="flex items-center justify-between text-sm">
              <Link href="/forgot-password" className="text-slate-600 hover:text-slate-900">
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#2563eb] py-2.5 font-medium text-white shadow-md shadow-blue-900/25 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/80 hover:bg-slate-100 text-slate-800 font-medium disabled:opacity-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
              </div>

              <p className="mt-6 text-center text-sm text-slate-500">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-slate-900 font-medium hover:underline">
                  Create account
                </Link>
              </p>
              <p className="mt-4 flex justify-center">
                <FeedbackLink variant="login" />
              </p>
            </div>
            <p className="mt-5 text-center text-xs text-white/75 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              © {new Date().getFullYear()} Construction Runner
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen flex flex-1 items-center justify-center bg-slate-950">
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-950 via-[#0f172a] to-[#0c1929]" aria-hidden />
          <div className="relative z-10 animate-spin h-8 w-8 rounded-full border-2 border-white/30 border-t-white" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
