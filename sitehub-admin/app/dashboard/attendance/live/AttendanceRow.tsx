"use client";

import { ChevronRight } from "lucide-react";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";
import { initialsFromLabel, TableNameCell } from "../../components/ui/TableChrome";
import type { AttendanceSession } from "./attendanceSessionTypes";
import { getAttendanceRowModel } from "./attendanceRowModel";

export default function AttendanceRow({
  session,
  operativeLabel,
  siteLabel,
  densityTd,
  now,
  onOpenDetails,
}: {
  session: AttendanceSession;
  operativeLabel: string;
  siteLabel: string;
  densityTd: string;
  now: Date;
  onOpenDetails: () => void;
}) {
  const { timeFormat } = useDisplayPreferences();
  const { timeLines, durationLabel, statusLabel, active } = getAttendanceRowModel(
    session,
    now,
    timeFormat
  );

  const chip = active
    ? "status-chip--ok"
    : session.kind === "absent"
      ? "status-chip--warn"
      : "status-chip--muted";

  return (
    <tr
      className="data-table-row cursor-pointer border-b border-slate-100/90 transition-colors duration-[120ms] last:border-b-0 hover:bg-blue-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:border-slate-700/60 dark:hover:bg-slate-700/80"
      onClick={onOpenDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetails();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open details for ${operativeLabel}`}
    >
      <td className={`${densityTd} align-middle`}>
        <TableNameCell initials={initialsFromLabel(operativeLabel)} label={operativeLabel} />
      </td>
      <td className={`${densityTd} align-middle text-slate-600 dark:text-slate-400`}>{siteLabel}</td>
      <td className={`${densityTd} align-middle`}>
        <div className="space-y-0.5 text-sm tabular-nums text-slate-800 dark:text-slate-200">
          {timeLines.length ? timeLines.map((line) => <div key={line}>{line}</div>) : "—"}
        </div>
      </td>
      <td className={`${densityTd} align-middle`}>
        <span className="text-sm font-medium tabular-nums text-slate-700 dark:text-slate-300">{durationLabel}</span>
      </td>
      <td className={`${densityTd} align-middle`}>
        <span className={`status-chip ${chip}`}>{statusLabel}</span>
      </td>
      <td className={`${densityTd} align-middle text-right`}>
        <ChevronRight className="ml-auto h-4 w-4 text-gray-400" aria-hidden />
      </td>
    </tr>
  );
}
