/** Authorize Vercel Cron or GitHub Actions: both send `Authorization: Bearer <CRON_SECRET>`. */
export function isAttendanceCronAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

export const ATTENDANCE_ALERTS_DISPATCH_PATH = "/api/maintenance/dispatch-attendance-alerts";

/** The database (pg_net) calls the alert dispatcher with its own secret; CRON_SECRET also works. */
export function isAttendanceAlertsDispatchAuthorized(req: Request): boolean {
  const secret = process.env.ATTENDANCE_ALERTS_SECRET;
  const authHeader = req.headers.get("authorization");
  if (secret && authHeader === `Bearer ${secret}`) return true;
  return isAttendanceCronAuthorized(req);
}
