import type { AttendanceLog, AttendanceSession, ExitReasonKind, TimestampLike } from "./attendanceSessionTypes";

export function normalizeActionKey(action: string | undefined): string {
  return (action ?? "").toUpperCase().replace(/\s+/g, "_");
}

export function isSignOutAction(action: string | undefined): boolean {
  const a = normalizeActionKey(action);
  return a === "SIGN_OUT" || a === "OUT" || a === "SIGNOUT" || a === "CHECKOUT";
}

export function isAbsentAction(action: string | undefined): boolean {
  const a = normalizeActionKey(action);
  return a === "ABSENT" || a === "MARK_ABSENT";
}

export function isSignInAction(action: string | undefined): boolean {
  const a = normalizeActionKey(action);
  return a === "SIGN_IN" || a === "IN" || a === "SIGNIN" || a === "CHECKIN";
}

export const parseTimestamp = (value: TimestampLike | undefined): Date | null => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value instanceof Date) return value;
  if (typeof value === "object" && value.toDate && typeof value.toDate === "function") {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  return null;
};

export function getLogUserId(log: AttendanceLog): string {
  return String(log.userId ?? log.user_id ?? log.operativeId ?? log.uid ?? "").trim();
}

function tryParseAutoSignOutJson(segment: string): { auto_sign_out?: boolean; auto_sign_out_reason?: string } | null {
  const s = segment.trim();
  if (!s.startsWith("{")) return null;
  try {
    const o = JSON.parse(s) as Record<string, unknown>;
    if (o && typeof o === "object" && o.auto_sign_out === true) {
      return o as { auto_sign_out?: boolean; auto_sign_out_reason?: string };
    }
  } catch {
    /* not JSON */
  }
  return null;
}

/** Prefer structured fields; fall back to trailing JSON in notes (mobile auto sign-out). */
function autoMetaFromLog(log: AttendanceLog | null): {
  auto: boolean;
  reason: string;
} | null {
  if (!log) return null;
  const flag = log.autoSignOut === true || log.auto_sign_out === true;
  const reason = String(log.autoSignOutReason ?? log.auto_sign_out_reason ?? "").trim();
  if (flag || reason) {
    return { auto: flag, reason: reason.toLowerCase() };
  }
  const raw = log.notes?.trim();
  if (!raw) return null;
  const lastNl = raw.lastIndexOf("\n");
  const tail = lastNl === -1 ? raw : raw.slice(lastNl + 1);
  const headWhole = tryParseAutoSignOutJson(raw);
  if (headWhole) {
    return {
      auto: true,
      reason: String(headWhole.auto_sign_out_reason ?? "").toLowerCase(),
    };
  }
  const meta = tryParseAutoSignOutJson(tail);
  if (!meta) return null;
  return {
    auto: true,
    reason: String(meta.auto_sign_out_reason ?? "").toLowerCase(),
  };
}

/**
 * Classify how the session ended (for badge). Active sessions → null.
 */
export function getExitReasonKind(session: AttendanceSession): ExitReasonKind | null {
  if (session.kind !== "work_session") return null;
  const end = getSessionEndDate(session);
  if (!end) return null;

  const outMeta = autoMetaFromLog(session.signOutLog);
  const inMeta = autoMetaFromLog(session.signInLog);
  const meta = outMeta?.auto || outMeta?.reason ? outMeta : inMeta;

  if (!meta?.auto && !meta?.reason) return "manual";
  if (meta.reason === "fallback") return "server_check";
  return "auto";
}

export function getSessionStartDate(session: AttendanceSession): Date | null {
  if (session.kind === "absent" && session.absentLog) {
    return parseTimestamp(session.absentLog.timestamp);
  }
  if (session.kind === "orphan_sign_out" && session.signOutLog) {
    return null;
  }
  if (session.signInLog) {
    return parseTimestamp(session.signInLog.timestamp);
  }
  return null;
}

export function getSessionEndDate(session: AttendanceSession): Date | null {
  if (session.kind === "absent") {
    return null;
  }
  if (session.kind === "orphan_sign_out" && session.signOutLog) {
    return (
      parseTimestamp(session.signOutLog.exitTime ?? session.signOutLog.exit_time) ??
      parseTimestamp(session.signOutLog.signOutTime ?? session.signOutLog.sign_out_time) ??
      parseTimestamp(session.signOutLog.timestamp)
    );
  }

  const inPlaceExit =
    session.signInLog &&
    (parseTimestamp(session.signInLog.exitTime ?? session.signInLog.exit_time) ??
      null);
  if (inPlaceExit) return inPlaceExit;

  if (session.signOutLog) {
    return (
      parseTimestamp(session.signOutLog.exitTime ?? session.signOutLog.exit_time) ??
      parseTimestamp(session.signOutLog.signOutTime ?? session.signOutLog.sign_out_time) ??
      parseTimestamp(session.signOutLog.timestamp)
    );
  }

  return null;
}

export function isActiveWorkSession(session: AttendanceSession): boolean {
  if (session.kind !== "work_session") return false;
  return getSessionEndDate(session) == null;
}

/** Prefer sign-in, then sign-out, then absent row — for company / name resolution */
export function getPrimaryAttendanceLog(session: AttendanceSession): AttendanceLog | null {
  return session.signInLog ?? session.signOutLog ?? session.absentLog;
}

export function formatDurationBetween(start: Date, end: Date): string {
  let ms = end.getTime() - start.getTime();
  if (ms < 0) ms = 0;
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/**
 * Pair SIGN_IN rows with the following SIGN_OUT per user (chronological).
 * Handles in-place completion on SIGN_IN (exit_time set without a separate SIGN_OUT row).
 */
export function buildAttendanceSessions(logs: AttendanceLog[]): AttendanceSession[] {
  const byUser = new Map<string, AttendanceLog[]>();
  for (const log of logs) {
    const uid = getLogUserId(log) || "__unknown__";
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid)!.push(log);
  }

  const sessions: AttendanceSession[] = [];

  for (const [userId, userLogs] of byUser) {
    const sorted = [...userLogs].sort((a, b) => {
      const ta = parseTimestamp(a.timestamp)?.getTime() ?? 0;
      const tb = parseTimestamp(b.timestamp)?.getTime() ?? 0;
      if (ta !== tb) return ta - tb;
      return String(a.id).localeCompare(String(b.id));
    });

    let pendingIn: AttendanceLog | null = null;

    const flushPendingOpen = () => {
      if (!pendingIn) return;
      sessions.push({
        id: `open-${pendingIn.id}`,
        kind: "work_session",
        userId,
        signInLog: pendingIn,
        signOutLog: null,
        absentLog: null,
      });
      pendingIn = null;
    };

    for (const log of sorted) {
      if (isAbsentAction(log.action)) {
        flushPendingOpen();
        sessions.push({
          id: `absent-${log.id}`,
          kind: "absent",
          userId,
          signInLog: null,
          signOutLog: null,
          absentLog: log,
        });
        continue;
      }

      if (isSignInAction(log.action)) {
        const exitFromRow = parseTimestamp(log.exitTime ?? log.exit_time);
        if (exitFromRow) {
          flushPendingOpen();
          sessions.push({
            id: `inplace-${log.id}`,
            kind: "work_session",
            userId,
            signInLog: log,
            signOutLog: null,
            absentLog: null,
          });
          continue;
        }

        if (pendingIn) {
          sessions.push({
            id: `open-${pendingIn.id}`,
            kind: "work_session",
            userId,
            signInLog: pendingIn,
            signOutLog: null,
            absentLog: null,
          });
        }
        pendingIn = log;
        continue;
      }

      if (isSignOutAction(log.action)) {
        if (pendingIn) {
          sessions.push({
            id: `pair-${pendingIn.id}-${log.id}`,
            kind: "work_session",
            userId,
            signInLog: pendingIn,
            signOutLog: log,
            absentLog: null,
          });
          pendingIn = null;
        } else {
          flushPendingOpen();
          // Same DB row updated in place (e.g. server fallback auto sign-out): one SIGN OUT row
          // still carries the original sign-in `timestamp` while `exit_time` / `sign_out_time` are set.
          const endInPlace =
            parseTimestamp(log.exitTime ?? log.exit_time) ??
            parseTimestamp(log.signOutTime ?? log.sign_out_time) ??
            parseTimestamp(log.timestamp);
          const startInPlace =
            parseTimestamp(log.timestamp) ?? parseTimestamp(log.createdAt ?? log.created_at);
          // Require start < end so a normal SIGN OUT *insert* (timestamp ≈ exit) stays a true orphan.
          if (
            endInPlace &&
            startInPlace &&
            startInPlace.getTime() < endInPlace.getTime()
          ) {
            sessions.push({
              id: `inplace-row-${log.id}`,
              kind: "work_session",
              userId,
              signInLog: log,
              signOutLog: log,
              absentLog: null,
            });
          } else {
            sessions.push({
              id: `orphan-${log.id}`,
              kind: "orphan_sign_out",
              userId,
              signInLog: null,
              signOutLog: log,
              absentLog: null,
            });
          }
        }
        continue;
      }

      flushPendingOpen();
      sessions.push({
        id: `misc-${log.id}`,
        kind: "work_session",
        userId,
        signInLog: log,
        signOutLog: null,
        absentLog: null,
      });
    }

    flushPendingOpen();
  }

  sessions.sort((a, b) => {
    const sa = getSessionSortTime(a);
    const sb = getSessionSortTime(b);
    return sb - sa;
  });

  return sessions;
}

function getSessionSortTime(s: AttendanceSession): number {
  const end = getSessionEndDate(s);
  const start = getSessionStartDate(s);
  const t = end?.getTime() ?? start?.getTime() ?? 0;
  return t;
}
