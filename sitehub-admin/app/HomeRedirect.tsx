"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Handles root (/) redirects. If URL has hash with type=recovery (password reset link),
 * redirect to /reset-password to preserve the recovery session. Otherwise go to dashboard.
 */
export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash || "";
    const params = new URLSearchParams(window.location.search);
    if (hash.includes("type=recovery")) {
      router.replace("/reset-password" + hash);
      return;
    }
    if (params.has("code") || params.has("token_hash")) {
      router.replace("/reset-password?" + params.toString());
      return;
    }
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
}
