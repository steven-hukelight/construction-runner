"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/**
 * Handles "Invalid Refresh Token" and similar auth errors by clearing stale
 * session data and redirecting to login.
 */
export function AuthErrorHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let didClear = false;
    const clearSessionAndRedirect = async () => {
      if (didClear) return;
      didClear = true;
      await supabase.auth.signOut({ scope: "local" });
      try {
        ["role", "user_email", "companyId", "impersonating"].forEach(
          (name) => (document.cookie = `${name}=; path=/; max-age=0`)
        );
      } catch {
        /* document.cookie access denied */
      }
      if (typeof window !== "undefined") {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith("sb-") || k === "sb_token" || k === "remembered_email")
          .forEach((k) => window.localStorage.removeItem(k));
      }
      if (!pathname?.startsWith("/login") && !pathname?.startsWith("/register")) {
        router.replace("/login");
      }
    };

    const handleAuthError = (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg?.includes("Refresh Token") ||
        msg?.includes("refresh_token") ||
        msg?.includes("Invalid Refresh Token")
      ) {
        clearSessionAndRedirect();
      }
    };

    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      handleAuthError(event.reason);
    };
    window.addEventListener("unhandledrejection", unhandledRejectionHandler);

    async function checkSession() {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
      } catch (err) {
        handleAuthError(err);
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && pathname?.startsWith("/dashboard")) {
        clearSessionAndRedirect();
      }
    });

    checkSession();

    return () => {
      window.removeEventListener("unhandledrejection", unhandledRejectionHandler);
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
