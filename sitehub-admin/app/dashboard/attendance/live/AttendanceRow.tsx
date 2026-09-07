"use client";

import { formatTime, useDisplayPreferences } from "@/app/DisplayPreferencesProvider";
import type { AttendanceSession } from "./attendanceSessionTypes";
import {
  formatDurationBetween,
  getSessionEndDate,
  getSessionStartDate,
  isActiveWorkSession,
} from "./attendanceSessionUtils";

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
  const start = getSessionStartDate(session);
  const end = getSessionEndDate(session);
  const active = isActiveWorkSession(session);

  const timeOpts = { timeFormat };

  let sessionTimeLabel: string;
  if (session.kind === "absent") {
    sessionTimeLabel = start ? formatTime(start, timeOpts) : "—";
  } else if (session.kind === "orphan_sign_out") {
    const endHm = end ? formatTime(end, timeOpts) : "—";
    sessionTimeLabel = `— · Out ${endHm}`;
  } else if (active && start) {
    sessionTimeLabel = `In ${formatTime(start, timeOpts)} · Out —`;
  } else if (start && end) {
    sessionTimeLabel = `In ${formatTime(start, timeOpts)} · Out ${formatTime(end, timeOpts)}`;
  } else if (start) {
    sessionTimeLabel = `In ${formatTime(start, timeOpts)} · Out —`;
  } else {
    sessionTimeLabel = "—";
  }

  let durationLabel: string;
  if (session.kind === "absent") {
    durationLabel = "—";
  } else if (start && end) {
    durationLabel = formatDurationBetween(start, end);
  } else if (start && active) {
    durationLabel = formatDurationBetween(start, now);
  } else {
    durationLabel = "—";
  }

  let statusLabel: string;
  if (session.kind === "absent") {
    statusLabel = "Absent";
  } else if (session.kind === "orphan_sign_out") {
    statusLabel = "Exit only";
  } else if (active) {
    statusLabel = "Active";
  } else {
    statusLabel = "Completed";
  }

  const rowTone = active
    ? "bg-emerald-500/[0.06] dark:bg-emerald-500/[0.08] hover:bg-emerald-500/[0.09] dark:hover:bg-emerald-500/[0.12]"
    : "bg-transparent hover:bg-slate-50/80 dark:hover:bg-slate-800/40 opacity-95";

  return (
    <tr className={`border-b border-slate-100 dark:border-slate-700/80 transition-colors ${rowTone}`}>
      <td className={`${densityTd} align-middle`}>
        <span className="font-medium text-slate-900 dark:text-slate-100">{operativeLabel}</span>
      </td>
      <td className={`${densityTd} align-middle text-slate-600 dark:text-slate-400`}>{siteLabel}</td>
      <td className={`${densityTd} align-middle`}>
        <span className="tabular-nums text-sm text-slate-800 dark:text-slate-200 whitespace-nowrap">
          {sessionTimeLabel}
        </span>
      </td>
      <td className={`${densityTd} align-middle`}>
        <span className="tabular-nums text-sm font-medium text-slate-700 dark:text-slate-300">{durationLabel}</span>
      </td>
      <td className={`${densityTd} align-middle`}>
        <span
          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
            active
              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-500/20"
              : session.kind === "absent"
                ? "bg-amber-500/12 text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/20"
                : "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/15"
          }`}
        >
          {statusLabel}
        </span>
      </td>
      <td className={`${densityTd} align-middle text-right`}>
        <button
          type="button"
          onClick={onOpenDetails}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Details
        </button>
      </td>
    </tr>
  );
}
