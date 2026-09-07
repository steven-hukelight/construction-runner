"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/supabase/auth/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await supabase.auth.signOut({ scope: "local" });
      
      // Clear cookies
      try {
        ["role", "user_email", "companyId", "impersonating"].forEach(
          (name) => (document.cookie = `${name}=; path=/; max-age=0`)
        );
      } catch {
        /* document.cookie access denied */
      }
      
      // Clear localStorage (Supabase tokens + app state)
      if (typeof window !== "undefined") {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith("sb-") || k === "sb_token" || k === "remembered_email")
          .forEach((k) => window.localStorage.removeItem(k));
      }
      
      router.push("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-md text-sm text-gray-700 dark:text-slate-200 transition-colors"
    >
      Logout
    </button>
  );
}
