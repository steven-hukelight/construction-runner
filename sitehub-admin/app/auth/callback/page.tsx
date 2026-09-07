"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { setUserCookies } from "@/app/login/actions";


function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        const code = searchParams.get("code");
        const errorParam = searchParams.get("error");
        // Supabase can put errors in the hash (e.g. otp_expired)
        const hash = typeof window !== "undefined" ? window.location.hash || "" : "";
        const hashHasError = hash.includes("error=") || hash.includes("error_code=");

        // If Supabase sent an error (query or hash)
        if (errorParam || hashHasError) {
          if (!cancelled) {
            setStatus("error");
            // For recovery errors, send to reset-password so it can show the proper message
            const next = searchParams.get("next");
            if (next === "/reset-password") {
              router.replace("/reset-password" + (hash || ""));
            } else {
              router.replace(`/admin/login?error=${encodeURIComponent(errorParam || "Authentication failed")}`);
            }
          }
          return;
        }

        // If OAuth or recovery returned a code, exchange it for a session
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;

          if (error) {
            setStatus("error");
            router.replace(`/admin/login?error=${encodeURIComponent(error.message)}`);
            return;
          }

          const next = searchParams.get("next");
          if (next === "/reset-password") {
            router.replace("/reset-password");
            return;
          }

          const email = data?.session?.user?.email;
          if (!email) {
            setStatus("error");
            router.replace("/admin/login?error=No+email+in+session");
            return;
          }

          const result = await setUserCookies(email, true, data?.session?.user?.id);
          if (!result?.role) {
            setStatus("error");
            await supabase.auth.signOut({ scope: "local" });
            const pendingMsg =
              "Your account is pending approval. An administrator must approve it before you can sign in.";
            router.replace(
              result?.restricted === "operative"
                ? "/admin/login?blocked=operative"
                : result && "pendingApproval" in result && result.pendingApproval
                  ? `/admin/login?error=${encodeURIComponent(pendingMsg)}`
                  : "/admin/login?error=Account+not+found.+Contact+administrator."
            );
            return;
          }
          router.replace(next && next.startsWith("/") ? next : "/dashboard");
          return;
        }

        // No code? Could be implicit flow (hash) - redirect to next with hash if recovery
        const next = searchParams.get("next");
        if (next === "/reset-password" && typeof window !== "undefined" && window.location.hash) {
          router.replace("/reset-password" + window.location.hash);
          return;
        }

        // Try to read existing session (e.g. after hash processed by detectSessionInUrl)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;

        if (sessionError || !session?.user?.email) {
          setStatus("error");
          router.replace("/admin/login?error=No+session+after+sign-in");
          return;
        }

        const result = await setUserCookies(session.user.email, true, session.user.id);
        if (!result?.role) {
          setStatus("error");
          await supabase.auth.signOut({ scope: "local" });
          const pendingMsg =
            "Your account is pending approval. An administrator must approve it before you can sign in.";
          router.replace(
            result?.restricted === "operative"
              ? "/admin/login?blocked=operative"
              : result && "pendingApproval" in result && result.pendingApproval
                ? `/admin/login?error=${encodeURIComponent(pendingMsg)}`
                : "/admin/login?error=Account+not+found.+Contact+administrator."
          );
          return;
        }
        router.replace(next && next.startsWith("/") ? next : "/dashboard");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          router.replace(
            `/admin/login?error=${encodeURIComponent(
              err instanceof Error ? err.message : "Callback failed"
            )}`
          );
        }
      }
    }

    handleCallback();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">
          {status === "loading" ? "Completing sign in ..." : "Redirecting ..."}
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Completing sign in ...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
