"use client";

import { UserRound } from "lucide-react";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";
import { TableNameCell } from "../../components/ui/TableChrome";
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
    <tr className="data-table-row border-b border-slate-100/90 transition-colors last:border-b-0 hover:bg-blue-50/70 dark:border-slate-700/60 dark:hover:bg-slate-700/80">
      <td className={`${densityTd} align-middle`}>
        <TableNameCell icon={UserRound} label={operativeLabel} />
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
        <button type="button" onClick={onOpenDetails} className="table-link">
          Details
        </button>
      </td>
    </tr>
  );
}
