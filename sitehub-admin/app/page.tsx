"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LandingPage from "./LandingPage";

/**
 * Root (/): show marketing landing page. If URL has password-recovery params, redirect to reset-password.
 */
export default function Home() {
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
  }, [router]);

  return <LandingPage />;
}
