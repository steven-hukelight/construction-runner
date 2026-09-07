/**
 * Shared ordering for attendance rows: newest insert first.
 * Matches GET /api/me/attendance-status merge sort and POST latest-row queries (created_at, then timestamp).
 */
export type AttendanceOrderFields = {
  timestamp: string;
  created_at?: string | null;
};

/** Newest first: created_at DESC (nulls last), then timestamp DESC. */
export function compareAttendanceNewestFirst(a: AttendanceOrderFields, b: AttendanceOrderFields): number {
  const ca = a.created_at ? new Date(a.created_at).getTime() : Number.NEGATIVE_INFINITY;
  const cb = b.created_at ? new Date(b.created_at).getTime() : Number.NEGATIVE_INFINITY;
  if (ca !== cb) return cb - ca;
  const ta = new Date(a.timestamp).getTime();
  const tb = new Date(b.timestamp).getTime();
  return tb - ta;
}
