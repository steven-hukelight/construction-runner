"use client";

import { useState, useCallback, useEffect } from "react";
import LiveAttendance from "./LiveAttendance";
import SignInOut from "./SignInOut";
import RoleCall from "./RoleCall";
import { useTransition } from "react";
import { getRoleFromClient, getCompanyIdFromClient } from "@/lib/utils/cookies";
import { Calendar, UserRoundPen } from "lucide-react";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const tabs = [
  { id: "live", label: "Live" },
  { id: "role", label: "Role Call" },
] as const;

export default function AttendanceTabs() {
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("live");
  const [pending, startTransition] = useTransition();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [recordAttendanceOpen, setRecordAttendanceOpen] = useState(false);
  const [showSuperuserHint, setShowSuperuserHint] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-500" />
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
          <input
            type="date"
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value || todayStr())}
          />
          {selectedDate !== todayStr() && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr())}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Today
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        {active === "live" ? (
          <button
            type="button"
            onClick={() => setRecordAttendanceOpen((o) => !o)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:border-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            aria-expanded={recordAttendanceOpen}
          >
            <UserRoundPen className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
            {recordAttendanceOpen ? "Hide form" : "Record attendance"}
          </button>
        ) : null}
      </div>

      {active === "live" && (
        <div className="space-y-4">
          {recordAttendanceOpen && (
            <div className="rounded-xl border border-gray-200/80 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm p-5">
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                Sign an operative in or out and optionally attach a site and notes.
              </p>
              <SignInOut embedded onRecorded={triggerRefetch} />
            </div>
          )}
          <div className="bg-white dark:bg-slate-800 border border-gray-200/60 dark:border-slate-600 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Live Attendance</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  The live list archives automatically at midnight (UK). Pick a past date to view the archive.
                </p>
              </div>
              <button
                onClick={refreshAttendance}
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600 transition-all"
                title="Refresh missing names and sites"
              >
                {pending ? "Refreshing..." : "Refresh names/sites"}
              </button>
            </div>
            <LiveAttendance refreshTrigger={refreshTrigger} selectedDate={selectedDate} />
          </div>
        </div>
      )}

      {active === "role" && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200/60 dark:border-slate-600 rounded-xl shadow-sm p-6">
          <RoleCall
            selectedDate={selectedDate}
            onArchived={() => setSelectedDate(todayStr())}
          />
        </div>
      )}
    </div>
  );
}
