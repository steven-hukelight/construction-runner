/** Authorize Vercel Cron or GitHub Actions: both send `Authorization: Bearer <CRON_SECRET>`. */
export function isAttendanceCronAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}
