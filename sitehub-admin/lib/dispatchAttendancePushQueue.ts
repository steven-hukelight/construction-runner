import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendPushToUsers } from "@/lib/onesignal";

type QueueRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
};

/**
 * Sends OneSignal push for rows in `notifications` queued by
 * perform_attendance_fallback / attendance_immediate_geofence_exit_sign_out.
 *
 * Dedupe strategy:
 *   - The DB has a partial unique index on (user_id, data->>'attendance_id')
 *     for type='attendance_auto_sign_out', so at most one row exists per
 *     session.
 *   - Within a single dispatch batch we still collapse by
 *     (user_id, attendance_id) as a defensive measure and mark all rows in a
 *     group as dispatched after one push.
 *
 * Idempotent via push_dispatched_at.
 */
export async function dispatchPendingAttendancePushNotifications(limit = 50): Promise<{
  attempted: number;
  sent: number;
  suppressedDuplicates: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const { data: rows, error: fetchErr } = await supabaseAdmin
    .from("notifications")
    .select("id, user_id, title, body, data")
    .eq("type", "attendance_auto_sign_out")
    .is("push_dispatched_at", null)
    .not("user_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (fetchErr) {
    errors.push(fetchErr.message);
    return { attempted: 0, sent: 0, suppressedDuplicates: 0, errors };
  }

  const list = (rows ?? []) as QueueRow[];

  // Group by (user_id, attendance_id) — first row in the group is dispatched,
  // duplicates are marked dispatched without sending another push.
  type Group = { primary: QueueRow; duplicates: QueueRow[] };
  const groups = new Map<string, Group>();
  for (const r of list) {
    const attId =
      r.data && typeof r.data === "object" && !Array.isArray(r.data)
        ? String((r.data as Record<string, unknown>).attendance_id ?? "").trim()
        : "";
    // If no attendance_id, treat each row as its own group so we don't collapse
    // unrelated notifications.
    const key = attId ? `${r.user_id}::${attId}` : `${r.user_id}::__row_${r.id}`;
    const g = groups.get(key);
    if (g) {
      g.duplicates.push(r);
    } else {
      groups.set(key, { primary: r, duplicates: [] });
    }
  }

  let sent = 0;
  let suppressedDuplicates = 0;

  for (const { primary, duplicates } of groups.values()) {
    const uid = String(primary.user_id);
    const rawData =
      primary.data && typeof primary.data === "object" && !Array.isArray(primary.data)
        ? (primary.data as Record<string, unknown>)
        : null;
    const data = rawData
      ? (Object.fromEntries(
          Object.entries(rawData).map(([k, v]) => [k, String(v ?? "")])
        ) as Record<string, string>)
      : undefined;

    const res = await sendPushToUsers(
      [uid],
      primary.title || "Attendance",
      primary.body || "You were signed out after leaving the site boundary.",
      data
    );
    if (!res.sent) {
      if (res.error) errors.push(res.error);
      // Leave both primary and duplicates queued for retry next tick.
      continue;
    }

    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabaseAdmin
      .from("notifications")
      .update({ push_dispatched_at: nowIso })
      .eq("id", primary.id);
    if (updErr) {
      errors.push(updErr.message);
      continue;
    }
    sent++;

    if (duplicates.length > 0) {
      const dupIds = duplicates.map((d) => d.id);
      // Mark duplicates as dispatched (suppressed). Failures here just leave
      // them in the queue; they'll be re-collapsed next tick.
      const { error: dupErr } = await supabaseAdmin
        .from("notifications")
        .update({ push_dispatched_at: nowIso })
        .in("id", dupIds);
      if (dupErr) {
        errors.push(dupErr.message);
      } else {
        suppressedDuplicates += duplicates.length;
      }
    }
  }

  return {
    attempted: list.length,
    sent,
    suppressedDuplicates,
    errors: errors.slice(0, 20),
  };
}
