"use client";

import { PersonPicker, SitePicker } from "../../components/ui/SitePicker";

type User = {
  id: string;
  name?: string;
  display_name?: string;
  email?: string;
  displayName?: string;
};

type Site = { id: string; name?: string };

export default function AttendanceFilters({
  sites,
  users,
  selectedSiteId,
  selectedUserId,
  onSiteChange,
  onUserChange,
  showDatePicker,
  selectedDate,
  onDateChange,
  onTodayClick,
  isToday,
  activeSessionsOnly,
  onActiveSessionsOnlyChange,
}: {
  sites: Site[];
  users: User[];
  selectedSiteId: string;
  selectedUserId: string;
  onSiteChange: (siteId: string) => void;
  onUserChange: (userId: string) => void;
  showDatePicker: boolean;
  selectedDate: string;
  onDateChange: (ymd: string) => void;
  onTodayClick: () => void;
  isToday: boolean;
  activeSessionsOnly: boolean;
  onActiveSessionsOnlyChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex flex-wrap items-end gap-3">
        {showDatePicker && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Date</label>
              <input
                type="date"
                className="input text-sm py-1.5 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
              />
            </div>
            {!isToday && (
              <button
                type="button"
                onClick={onTodayClick}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Today
              </button>
            )}
          </>
        )}
        <SitePicker
          sites={sites}
          value={selectedSiteId}
          onChange={onSiteChange}
          variant="compact"
          allowNone
          noneValue="all"
          noneLabel="All sites"
          placeholder="All sites"
          className="w-52"
        />
        <PersonPicker
          people={users.map((u) => ({
            id: u.id,
            name: u.display_name || u.displayName || u.name,
            email: u.email,
          }))}
          value={selectedUserId}
          onChange={onUserChange}
          fieldLabel="User"
          variant="compact"
          allowNone
          noneValue="all"
          noneLabel="All users"
          placeholder="All users"
          className="w-56"
        />
      </div>

      <label className="inline-flex items-center gap-2 cursor-pointer select-none rounded-lg border border-slate-200/90 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/60 px-3 py-2">
        <input
          type="checkbox"
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-500 dark:bg-slate-700"
          checked={activeSessionsOnly}
          onChange={(e) => onActiveSessionsOnlyChange(e.target.checked)}
        />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Active entries only</span>
      </label>
    </div>
  );
}
