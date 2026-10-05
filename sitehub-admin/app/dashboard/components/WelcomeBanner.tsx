"use client";

import { useEffect, useState, type ReactNode } from "react";
import { formatDate } from "@/app/DisplayPreferencesProvider";
import { Clock, LogIn } from "lucide-react";
import useSWR from "swr";

type WelcomeBannerProps = {
  subtitle?: string;
  /** Site clock-in pill — only for field roles (e.g. supervisor); set from server via {@link isSiteAttendanceRole}. */
  showSiteAttendance?: boolean;
  /** Header buttons, aligned right. */
  actions?: ReactNode;
};

export default function WelcomeBanner({ subtitle, showSiteAttendance = false, actions }: WelcomeBannerProps) {
  const { data: userName, isValidating } = useSWR(
    "/api/profiles/me",
    async (url) => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return "";
      const arr = (await res.json()) as Array<{ name?: string; displayName?: string }> | { name?: string; displayName?: string };
      const me = Array.isArray(arr) ? arr[0] : arr;
      return (me?.name ?? me?.displayName ?? "").trim();
    },
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );
  const { data: attendanceStatus } = useSWR(
    showSiteAttendance ? "/api/me/attendance-status" : null,
    async (url) => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return { signedIn: false };
      return res.json() as Promise<{ signedIn: boolean; siteName?: string }>;
    },
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => {
      clearInterval(timer);
      cancelAnimationFrame(raf);
    };
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const formattedDate = formatDate(currentTime);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-600 dark:bg-slate-800">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {mounted ? formattedDate : "\u00A0"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">
          {getGreeting()}
          {isValidating ? "" : `, ${userName || "there"}`}
        </h1>
        <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-slate-400">
          {subtitle ?? "Overview of sites and team activity"}
        </p>
      </div>
      {showSiteAttendance && attendanceStatus && (
        <p className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300 sm:ml-auto">
          {attendanceStatus.signedIn ? (
            <>
              <LogIn className="h-4 w-4 text-gray-400" />
              On site{attendanceStatus.siteName ? ` · ${attendanceStatus.siteName}` : ""}
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 text-gray-400" />
              Not clocked in
            </>
          )}
        </p>
      )}
      {actions && <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">{actions}</div>}
      </div>
    </div>
  );
}
