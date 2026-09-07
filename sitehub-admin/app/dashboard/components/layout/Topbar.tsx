"use client";

import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import LogoutButton from "../LogoutButton";
import NotificationDropdown from "../NotificationDropdown";
import FeedbackLink from "@/app/components/FeedbackLink";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getRoleFromClient, getUserEmailFromCookie } from "@/lib/utils/cookies";

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
  alerts: "Alert",
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
  const page = getPageTitle(pathname);

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
        <FeedbackLink variant="topbar" />
        <NotificationDropdown />

        <button
          onClick={handleProfile}
          className="inline-flex h-12 w-10 items-center justify-center rounded-[1.15rem] bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_12px_24px_rgba(37,99,235,0.3)] focus:outline-none focus:ring-4 focus:ring-blue-200"
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
