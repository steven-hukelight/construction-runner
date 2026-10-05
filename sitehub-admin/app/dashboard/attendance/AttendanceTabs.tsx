"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import LiveAttendance from "./LiveAttendance";
import SignInOut from "./SignInOut";
import RoleCall from "./RoleCall";
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [recordAttendanceOpen, setRecordAttendanceOpen] = useState(false);
  const [showSuperuserHint, setShowSuperuserHint] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const dateInputRef = useRef<HTMLInputElement>(null);

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

  const openDatePicker = useCallback(() => {
    const input = dateInputRef.current;
    if (!input) return;
    try {
      input.showPicker?.();
    } catch {
      input.focus();
    }
  }, []);

  return (
    <div className="space-y-6">
      {showSuperuserHint && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <strong>Superuser:</strong> Select a company in the top bar to view attendance for that company. Mobile app company selection does not affect the web dashboard.
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openDatePicker}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-700"
            aria-label="Open date picker"
          >
            <Calendar className="w-5 h-5" />
          </button>
          <label htmlFor="attendance-date" className="text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
          <input
            id="attendance-date"
            ref={dateInputRef}
            type="date"
            className="cursor-pointer rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="admin-tabs">
          {tabs.map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                className={isActive ? "active" : ""}
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
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
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
            <div className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-5">
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                Sign an operative in or out and optionally attach a site and notes.
              </p>
              <SignInOut embedded onRecorded={triggerRefetch} />
            </div>
          )}
          <div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Live Attendance</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                The live list archives automatically at midnight (UK). Pick a past date to view the archive.
              </p>
            </div>
            <LiveAttendance refreshTrigger={refreshTrigger} selectedDate={selectedDate} />
          </div>
        </div>
      )}

      {active === "role" && (
        <div>
          <RoleCall
            selectedDate={selectedDate}
            onArchived={() => setSelectedDate(todayStr())}
          />
        </div>
      )}
    </div>
  );
}
