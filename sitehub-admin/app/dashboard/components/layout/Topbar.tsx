"use client";

import React, { useEffect, useState } from "react";
import LogoutButton from "../LogoutButton";
import NotificationDropdown from "../NotificationDropdown";
import FeedbackLink from "@/app/components/FeedbackLink";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getRoleFromClient, getUserEmailFromCookie } from "@/lib/utils/cookies";

const CompanySwitcher = dynamic(() => import("../CompanySwitcher"), { ssr: false });

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

  function handleProfile() {
    router.push("/dashboard/profile");
  }

  // Resolve isSuperuser only after mount to avoid hydration mismatch (server has no cookies)
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [profileInitials, setProfileInitials] = useState("U");
  useEffect(() => {
    let cancelled = false;
    const emailFromCookie = getUserEmailFromCookie() ?? "";
    queueMicrotask(() => {
      if (cancelled) return;
      setIsSuperuser(getRoleFromClient()?.toLowerCase() === "superuser");
      if (emailFromCookie) {
        setProfileInitials(getInitials(emailFromCookie));
      }
    });

    fetch("/api/profiles/me", { cache: "no-store", credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json) return;
        const me = Array.isArray(json) && json.length ? json[0] : json;
        const label = String(me?.displayName || me?.name || me?.email || emailFromCookie || "").trim();
        if (label) {
          setProfileInitials(getInitials(label));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

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
