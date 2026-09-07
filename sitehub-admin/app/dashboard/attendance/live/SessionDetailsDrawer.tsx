"use client";

import type { ReactNode } from "react";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
import type { AttendanceLog, AttendanceSession } from "./attendanceSessionTypes";
import { describeAttendanceAutoSignOutReason, formatAttendanceNotesDisplay } from "./sessionNotesFormat";
import ExitReasonBadge from "./ExitReasonBadge";
import {
  getExitReasonKind,
  getSessionEndDate,
  getSessionStartDate,
  isAbsentAction,
  isSignInAction,
  isSignOutAction,
  parseTimestamp,
} from "./attendanceSessionUtils";

function collectNotesFromSession(session: AttendanceSession): string | undefined {
  const parts: string[] = [];
  const push = (raw: string | undefined) => {
    const s = raw?.trim();
    if (!s) return;
    if (parts.includes(s)) return;
    parts.push(s);
  };
  if (session.absentLog?.notes) push(String(session.absentLog.notes));
  if (session.signInLog?.notes) push(String(session.signInLog.notes));
  if (session.signOutLog?.notes) push(String(session.signOutLog.notes));
  const merged = parts.join("\n\n");
  return merged || undefined;
}

function fieldBlock(label: string, value: ReactNode | null | undefined) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && !String(value).trim()) return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}

function friendlyAttendanceAction(log: AttendanceLog): string {
  if (isAbsentAction(log.action)) return "Marked absent";
  if (isSignOutAction(log.action)) return "Signed out";
  if (isSignInAction(log.action)) return "Signed in";
  const raw = String(log.action ?? "").trim();
  return raw ? raw.replace(/_/g, " ") : "—";
}

function logMetaRows(log: AttendanceLog | null, title: string) {
  if (!log) return null;
  const ts = log.timestamp != null ? parseTimestamp(log.timestamp) : null;
  const exitRaw = log.exitTime ?? log.exit_time;
  const exitDt = exitRaw ? parseTimestamp(exitRaw) : null;
  const signOutRaw = log.signOutTime ?? log.sign_out_time;
  const signOutDt = signOutRaw ? parseTimestamp(signOutRaw) : null;
  const autoReason = log.autoSignOutReason ?? log.auto_sign_out_reason;
  const isAuto = log.autoSignOut === true || log.auto_sign_out === true;
  const signOutDiffers =
    exitDt &&
    signOutDt &&
    Math.abs(signOutDt.getTime() - exitDt.getTime()) > 90_000;

  return (
    <div className="space-y-3 rounded-lg border border-slate-200/80 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/40 p-3">
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</p>
      {fieldBlock("What happened", friendlyAttendanceAction(log))}
      {fieldBlock(
        "Time on attendance record",
        ts ? formatDateTime(ts) : log.timestamp != null ? String(log.timestamp) : undefined
      )}
      {isSignOutAction(log.action) && exitDt
        ? fieldBlock("Exit / leave time", formatDateTime(exitDt))
        : null}
      {isSignOutAction(log.action) && signOutDt && signOutDiffers
        ? fieldBlock("Sign-out processed", formatDateTime(signOutDt))
        : null}
      {isAuto ? fieldBlock("How it ended", describeAttendanceAutoSignOutReason(autoReason)) : null}
      <details className="group rounded-md border border-slate-200/60 dark:border-slate-600/80 bg-white/40 dark:bg-slate-900/30">
        <summary className="cursor-pointer select-none px-2 py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          Technical details
        </summary>
        <div className="border-t border-slate-200/60 dark:border-slate-600/80 px-2 py-2 space-y-2">
          {fieldBlock(
            "Record ID",
            <span className="font-mono text-[11px] break-all text-slate-600 dark:text-slate-300">{log.id}</span>
          )}
        </div>
      </details>
    </div>
  );
}

export default function SessionDetailsDrawer({
  session,
  companyLabel,
  open,
  onClose,
}: {
  session: AttendanceSession | null;
  companyLabel: string | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !session) return null;

  const start = getSessionStartDate(session);
  const end = getSessionEndDate(session);
  const exitKind = getExitReasonKind(session);
  const mergedNotes = collectNotesFromSession(session);
  const notesDisplay = formatAttendanceNotesDisplay(mergedNotes);
  const sameAttendanceRow =
    session.signInLog &&
    session.signOutLog &&
    session.signInLog.id === session.signOutLog.id;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50" aria-hidden onClick={onClose} />
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-slate-200/80 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-exit-drawer-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-600 px-5 py-4">
          <h2 id="entry-exit-drawer-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Entry & exit details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {fieldBlock("Company", companyLabel ?? undefined)}

          {session.kind === "absent" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Absent</p>
              {start ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">{formatDateTime(start)}</p>
              ) : null}
              {notesDisplay.main !== "—" ? (
                <div className="rounded-lg bg-amber-500/10 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                  {notesDisplay.variant === "absent" ? (
                    <>
                      <span className="font-semibold">{notesDisplay.main}</span>
                      {notesDisplay.detail ? <span className="text-amber-900/80 dark:text-amber-200/90"> · {notesDisplay.detail}</span> : null}
                    </>
                  ) : (
                    notesDisplay.main
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <dl className="space-y-4">
                {fieldBlock(
                  "Sign in · Sign out",
                  start && end
                    ? `In ${formatDateTime(start)} · Out ${formatDateTime(end)}`
                    : start
                      ? `In ${formatDateTime(start)} (still on site)`
                      : end
                        ? `Out ${formatDateTime(end)} (no sign-in row)`
                        : undefined
                )}
                {session.kind === "work_session" ? (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Exit type
                    </dt>
                    <dd className="mt-1">
                      <ExitReasonBadge kind={exitKind} />
                    </dd>
                  </div>
                ) : null}
              </dl>

              {mergedNotes && notesDisplay.main !== "—" ? (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                    Notes
                  </h3>
                  <div className="rounded-lg border border-slate-200/80 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {notesDisplay.variant === "plain" ? notesDisplay.main : (
                      <>
                        <span className="font-medium">{notesDisplay.main}</span>
                        {notesDisplay.detail ? <p className="mt-1 text-slate-600 dark:text-slate-400">{notesDisplay.detail}</p> : null}
                      </>
                    )}
                  </div>
                </div>
              ) : null}

              {sameAttendanceRow ? (
                logMetaRows(session.signInLog, "Attendance record")
              ) : (
                <>
                  {logMetaRows(session.signInLog, "Sign-in record")}
                  {session.signOutLog && isSignOutAction(session.signOutLog.action)
                    ? logMetaRows(session.signOutLog, "Sign-out record")
                    : null}
                </>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
