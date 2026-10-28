import { formatTime, type TimeFormat } from "@/app/DisplayPreferencesProvider";
import type { AttendanceSession } from "./attendanceSessionTypes";
import { formatLeftSiteLine } from "./sessionNotesFormat";
import {
  formatDurationBetween,
  getSessionAutoSignOutReason,
  getSessionEndDate,
  getSessionLeaveDate,
  getSessionSignedOutDate,
  getSessionStartDate,
  isActiveWorkSession,
} from "./attendanceSessionUtils";

export function getAttendanceRowModel(
  session: AttendanceSession,
  now: Date,
  timeFormat?: TimeFormat
) {
  const start = getSessionStartDate(session);
  const leave = getSessionLeaveDate(session);
  const signedOut = getSessionSignedOutDate(session);
  const end = getSessionEndDate(session);
  const active = isActiveWorkSession(session);
  const timeOpts = timeFormat ? { timeFormat } : undefined;
  const hm = (d: Date) => formatTime(d, timeOpts);

  const timeLines: string[] = [];
  if (session.kind === "absent") {
    if (start) timeLines.push(hm(start));
  } else if (active && start) {
    timeLines.push(`Signed in: ${hm(start)}`);
  } else {
    if (start) timeLines.push(`Signed in: ${hm(start)}`);
    const outAt = signedOut ?? (leave ? null : end);
    if (leave && outAt && hm(leave) === hm(outAt)) {
      timeLines.push(formatLeftSiteLine(hm(leave), getSessionAutoSignOutReason(session) || "fallback"));
    } else {
      if (leave) timeLines.push(formatLeftSiteLine(hm(leave), getSessionAutoSignOutReason(session)));
      if (outAt) timeLines.push(`Signed out: ${hm(outAt)}`);
    }
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
    statusLabel = "Signed out";
  } else if (active) {
    statusLabel = "Signed in";
  } else {
    statusLabel = "Signed out";
  }

  return { timeLines, durationLabel, statusLabel, active };
}
