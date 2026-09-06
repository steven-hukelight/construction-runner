import { compareAttendanceNewestFirst, type AttendanceOrderFields } from "@/lib/attendanceRowOrdering";
import { normalizeAttendanceAction } from "@/lib/attendanceRowEnrich";

export function isOpenSignInAction(raw: string | null | undefined): boolean {
  const norm = normalizeAttendanceAction(raw);
  return norm === "SIGN_IN" || norm === "IN" || norm === "SIGNIN" || norm === "CHECKIN";
}

/**
 * Pick the row that GET /api/me/attendance-status should treat as current.
 * POST /api/attendance uses the all-time latest row for already-signed-in.
 * If that latest row is still an open SIGN_IN from a previous UTC day, surface it
 * so Home and Check In agree.
 */
export function resolveAttendanceStatusRow<T extends AttendanceOrderFields & { action?: string | null }>(
  todayLatest: T | null,
  allTimeLatest: T | null
): T | null {
  if (todayLatest) {
    if (allTimeLatest && compareAttendanceNewestFirst(allTimeLatest, todayLatest) <= 0) {
      return allTimeLatest;
    }
    return todayLatest;
  }
  if (allTimeLatest && isOpenSignInAction(allTimeLatest.action)) {
    return allTimeLatest;
  }
  return null;
}
