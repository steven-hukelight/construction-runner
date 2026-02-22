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

        // If Supabase sent an error
        if (errorParam) {
          if (!cancelled) {
            setStatus("error");
            router.replace(`/login?error=${encodeURIComponent(errorParam)}`);
          }
          return;
        }

        // If OAuth returned a code, exchange it for a session
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;

          if (error) {
            setStatus("error");
            router.replace(`/login?error=${encodeURIComponent(error.message)}`);
            return;
          }

          const email = data?.session?.user?.email;
          if (!email) {
            setStatus("error");
            router.replace("/login?error=No+email+in+session");
            return;
          }

          const result = await setUserCookies(email, true, data?.session?.user?.id);
          if (!result?.role) {
            setStatus("error");
            router.replace("/login?error=Account+not+found.+Contact+administrator.");
            return;
          }
          router.replace("/dashboard");
          return;
        }

        // No code? Try to read existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;

        if (sessionError || !session?.user?.email) {
          setStatus("error");
          router.replace("/login?error=No+session+after+sign-in");
          return;
        }

        const result = await setUserCookies(session.user.email, true, session.user.id);
        if (!result?.role) {
          setStatus("error");
          router.replace("/login?error=Account+not+found.+Contact+administrator.");
          return;
        }
        router.replace("/dashboard");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          router.replace(
            `/login?error=${encodeURIComponent(
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
