"use client";

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
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
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
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Site</label>
          <select
            className="input text-sm py-1.5 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            value={selectedSiteId}
            onChange={(e) => onSiteChange(e.target.value)}
          >
            <option value="all">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || s.id}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">User</label>
          <select
            className="input text-sm py-1.5 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            value={selectedUserId}
            onChange={(e) => onUserChange(e.target.value)}
          >
            <option value="all">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name || u.displayName || u.name || (u.email ? String(u.email).split("@")[0] : u.id)}
              </option>
            ))}
          </select>
        </div>
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
