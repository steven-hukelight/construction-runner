"use client";

import { useTableDensityClasses } from "@/app/DisplayPreferencesProvider";
import { DataTableShell } from "../../components/ui/TableChrome";
import type { AttendanceSession } from "./attendanceSessionTypes";
import AttendanceRow from "./AttendanceRow";

export default function AttendanceTable({
  sessions,
  resolveOperativeLabel,
  resolveSiteLabel,
  now,
  onOpenSession,
  emptyMessage,
}: {
  sessions: AttendanceSession[];
  resolveOperativeLabel: (session: AttendanceSession) => string;
  resolveSiteLabel: (session: AttendanceSession) => string;
  now: Date;
  onOpenSession: (session: AttendanceSession) => void;
  emptyMessage?: string;
}) {
  const density = useTableDensityClasses();

  return (
    <DataTableShell
      className={sessions.length === 0 ? "" : "hidden md:block"}
      title="All attendance"
      subtitle={`${sessions.length} session${sessions.length === 1 ? "" : "s"}`}
    >
      <div className="overflow-x-auto">
        <table className={`data-table w-full ${density.table}`}>
          <thead>
            <tr className="data-table-header border-b border-blue-100/70 bg-[#eef4fa] text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-slate-500 dark:border-slate-600 dark:bg-slate-900/90 dark:text-slate-400">
              <th className={density.th}>Operative</th>
              <th className={density.th}>Site</th>
              <th className={density.th}>Sign in · Left site · Signed out</th>
              <th className={density.th}>Duration</th>
              <th className={density.th}>Status</th>
              <th className={`${density.th} text-right`} />
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-sm text-slate-500">
                  {emptyMessage ?? "No entries to show."}
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <AttendanceRow
                  key={session.id}
                  session={session}
                  operativeLabel={resolveOperativeLabel(session)}
                  siteLabel={resolveSiteLabel(session)}
                  densityTd={density.td}
                  now={now}
                  onOpenDetails={() => onOpenSession(session)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </DataTableShell>
  );
}
