"use client";

import React, { useEffect } from "react";
import { useProfileMe } from "@/lib/hooks/useDashboardData";
import LogoutButton from "../LogoutButton";
import NotificationDropdown from "../NotificationDropdown";
import FeedbackLink from "@/app/components/FeedbackLink";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useClientSession } from "../ClientSessionProvider";

const CompanySwitcher = dynamic(() => import("../CompanySwitcher"), { ssr: false });
const SiteSwitcher = dynamic(() => import("../SiteSwitcher"), { ssr: false });

function getInitials(value: string): string {
  const cleaned = value.trim();
  if (!cleaned) return "U";

  const parts = cleaned
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, email } = useClientSession();
  const isSuperuser = role?.toLowerCase() === "superuser";

  function handleProfile() {
    router.push("/dashboard/profile");
  }

  const { data: profile } = useProfileMe();
  const profileLabel = String(profile?.displayName || profile?.name || profile?.email || email || "").trim();
  const profileInitials = getInitials(profileLabel || "U");

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
        {isSuperuser && <CompanySwitcher />}
        <SiteSwitcher />
      </div>

      <div className="flex items-center gap-4">
        <FeedbackLink variant="topbar" />
        <NotificationDropdown />

        <button
          onClick={handleProfile}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          title="Open profile settings"
          aria-label="Open profile settings"
        >
          <span className="text-base font-semibold tracking-tight">{profileInitials}</span>
        </button>

        <LogoutButton />
      </div>
    </header>
  );
}
