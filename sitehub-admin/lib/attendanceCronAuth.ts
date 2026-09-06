/** Authorize Vercel Cron (GET) or a Bearer CRON_SECRET. */
export function isAttendanceCronAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }
  // Vercel Cron sends this when CRON_SECRET is unset.
  if (process.env.VERCEL === "1" && req.headers.get("x-vercel-cron") === "1") {
    return true;
  }
  return false;
}
