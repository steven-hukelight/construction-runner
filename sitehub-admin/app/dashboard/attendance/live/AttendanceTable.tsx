"use client";

import { useTableDensityClasses } from "@/app/DisplayPreferencesProvider";
import type { AttendanceSession } from "./attendanceSessionTypes";
import AttendanceRow from "./AttendanceRow";

export default function AttendanceTable({
  sessions,
  resolveOperativeLabel,
  resolveSiteLabel,
  now,
  onOpenSession,
}: {
  sessions: AttendanceSession[];
  resolveOperativeLabel: (session: AttendanceSession) => string;
  resolveSiteLabel: (session: AttendanceSession) => string;
  now: Date;
  onOpenSession: (session: AttendanceSession) => void;
}) {
  const density = useTableDensityClasses();

  return (
    <div className="overflow-auto rounded-xl border border-slate-200/80 dark:border-slate-600/80">
      <table className={`table w-full ${density.table}`}>
        <thead>
          <tr className="border-b border-slate-200/90 dark:border-slate-600 bg-slate-50/90 dark:bg-slate-800/80 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <th className={density.th}>Operative</th>
            <th className={density.th}>Site</th>
            <th className={density.th}>Sign in · Sign out</th>
            <th className={density.th}>Duration</th>
            <th className={density.th}>Status</th>
            <th className={`${density.th} text-right`} />
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <AttendanceRow
              key={session.id}
              session={session}
              operativeLabel={resolveOperativeLabel(session)}
              siteLabel={resolveSiteLabel(session)}
              densityTd={density.td}
              now={now}
              onOpenDetails={() => onOpenSession(session)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
