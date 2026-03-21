"use client";

import { useState, useCallback, useEffect } from "react";
import LiveAttendance from "./LiveAttendance";
import SignInOut from "./SignInOut";
import RoleCall from "./RoleCall";
import { useTransition } from "react";
import { getRoleFromClient, getCompanyIdFromClient } from "@/lib/utils/cookies";

const tabs = [
  { id: "live", label: "Live" },
  { id: "role", label: "Role Call" },
  { id: "approvals", label: "Approvals" },
] as const;

export default function AttendanceTabs() {
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("live");
  const [pending, startTransition] = useTransition();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSuperuserHint, setShowSuperuserHint] = useState(false);

  useEffect(() => {
    const check = () => {
      const isSuperuser = getRoleFromClient()?.toLowerCase() === "superuser";
      const companyId = getCompanyIdFromClient();
      setShowSuperuserHint(Boolean(isSuperuser && !companyId));
    };
    check();
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, [active]);

  const triggerRefetch = useCallback(() => {
    setRefreshTrigger((n) => n + 1);
  }, []);

  async function refreshAttendance() {
    try {
      startTransition(() => {});
      let companyId: string | null = null;
      try {
        const meRes = await fetch("/api/me", { credentials: "include" });
        if (meRes.ok) {
          const me = await meRes.json();
          companyId = me?.companyId ?? null;
        }
      } catch {
        /* ignore */
      }
      const res = await fetch("/api/maintenance/attendance-refresh", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const json = await res.json();
      if (res.ok) {
        triggerRefetch();
      }
      alert(
        res.ok
          ? `Refreshed ${json.total ?? 0} records. Updated names: ${json.nameUpdated ?? 0}, sites: ${json.siteUpdated ?? 0}`
          : `Refresh failed: ${json.error || "Unknown error"}`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      alert(`Refresh failed: ${msg}`);
    }
  }

  return (
    <div className="space-y-6">
      {showSuperuserHint && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <strong>Superuser:</strong> Select a company in the top bar to view attendance for that company. Mobile app company selection does not affect the web dashboard.
        </div>
      )}
      <div className="bg-white dark:bg-slate-800 border border-gray-200/60 dark:border-slate-600 rounded-xl shadow-sm p-1.5 inline-flex gap-1">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {active === "live" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <SignInOut />
          </div>
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-slate-800 border border-gray-200/60 dark:border-slate-600 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Live Attendance</h3>
                <button
                  onClick={refreshAttendance}
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600 transition-all"
                  title="Refresh missing names and sites"
                >
                  {pending ? "Refreshing..." : "Refresh names/sites"}
                </button>
              </div>
              <LiveAttendance refreshTrigger={refreshTrigger} />
            </div>
          </div>
        </div>
      )}

      {active === "role" && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200/60 dark:border-slate-600 rounded-xl shadow-sm p-6">
          <RoleCall />
        </div>
      )}

      {active === "approvals" && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200/60 dark:border-slate-600 rounded-xl shadow-sm p-6 flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-gray-500 dark:text-slate-400">No approvals to review.</p>
        </div>
      )}
    </div>
  );
}
