"use client";



import React, { useEffect } from "react";
import { Sparkles } from "lucide-react";
import LogoutButton from "../LogoutButton";
import NotificationDropdown from "../NotificationDropdown";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getRoleFromClient } from "@/lib/utils/cookies";

const CompanySwitcher = dynamic(() => import("../CompanySwitcher"), { ssr: false });

/** UUID pattern (lowercase/uppercase) */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Friendly titles when last path segment is an ID/UUID */
const SEGMENT_TO_TITLE: Record<string, string> = {
  users: "User profile",
  operatives: "Operative profile",
  sites: "Site",
  assets: "Asset",
  rams: "RAMS",
  "near-miss": "Near miss",
  messages: "Message",
  deliveries: "Delivery",
  companies: "Company",
};

function getPageTitle(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  const parent = parts[parts.length - 2] ?? "";

  if (!last) return "Dashboard";

  // When last segment looks like an ID (UUID or alphanumeric) and parent is a known entity, use friendly title
  const friendly = SEGMENT_TO_TITLE[parent];
  if (friendly && (UUID_REGEX.test(last) || (last.length >= 12 && /^[a-z0-9-]+$/i.test(last)))) {
    return friendly;
  }

  // Format slugs (e.g. pre-induction → Pre-Induction)
  return last
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const page = getPageTitle(pathname);

  function handleProfile() {
    router.push("/dashboard/profile");
  }
  const isSuperuser = typeof window !== "undefined" && getRoleFromClient()?.toLowerCase() === "superuser";

  // Clean cache-bust param from URL after company switch (keeps URL clean)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("_t")) {
      url.searchParams.delete("_t");
      const clean = url.pathname + (url.search || "") + url.hash;
      window.history.replaceState(null, "", clean || "/");
    }
  }, [pathname]);

  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 border border-blue-200/40 dark:border-slate-600">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1>{page}</h1>
          <p className="muted">Manage your construction projects</p>
        </div>
        {isSuperuser && (
          <div className="ml-4">
            <CompanySwitcher />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <NotificationDropdown />

        <button 
          onClick={handleProfile}
          className="relative overflow-hidden p-0.5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 cursor-pointer group"
          title="View profile"
        >
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-[10px] flex items-center justify-center">
            <span className="text-white font-bold text-base">S</span>
          </div>
        </button>

        <LogoutButton />
      </div>
    </header>
  );
}
