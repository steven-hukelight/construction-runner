import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendPushToUsers } from "@/lib/onesignal";

const TITLE = "Signed out";
const BODY = "You were signed out after leaving the site boundary.";

/**
 * Immediate OneSignal push when the API records an auto sign-out (native
 * geofence / client geofence exit / server geofence exit).
 *
 * Deduped per attendance session via a marker row in `public.notifications`
 * (partial unique index on `(user_id, data->>'attendance_id')` for
 * type='attendance_auto_sign_out'). If a marker already exists for this
 * session, the push is skipped. This prevents duplicate notifications when
 * multiple sign-out paths (client insert, native override, server geofence
 * RPC, pg_cron fallback) fire for the same attendance row.
 *
 * `attendanceId` should be the id of the attendance row that was just closed.
 * It's optional so callers that legitimately have no id (edge cases / retries)
 * still fall through to sending a push, but callers should pass it whenever
 * available.
 */
export async function sendAttendanceAutoSignOutPush(
  userId: string,
  reason: string,
  attendanceId?: string | null
): Promise<void> {
  const uid = String(userId).trim();
  if (!uid) return;
  const attId = attendanceId ? String(attendanceId).trim() : "";
  const reasonStr = String(reason || "native_geofence");
  const nowIso = new Date().toISOString();

  // If we have a session id, try to record a dedupe marker first. If the row
  // already exists, another path has already notified this user for this
  // session — skip.
  if (attId) {
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: uid,
        topic: "attendance",
        type: "attendance_auto_sign_out",
        title: TITLE,
        body: BODY,
        data: {
          type: "attendance_auto_sign_out",
          reason: reasonStr,
          trigger_source: "immediate_push",
          attendance_id: attId,
        },
        sent_at: nowIso,
        // Reserve this dedupe key. We'll flip push_dispatched_at to the send
        // timestamp after the push actually succeeds.
        push_dispatched_at: nowIso,
      })
      .select("id")
      .maybeSingle();

    if (insertErr) {
      // 23505 = unique_violation — another path already notified this session.
      if ((insertErr as { code?: string }).code === "23505") {
        console.log("[push] attendance auto sign-out deduped", {
          userId: uid,
          attendanceId: attId,
          reason: reasonStr,
        });
        return;
      }
      // Any other DB error: log and fall through to sending, so a DB blip
      // doesn't silently drop the notification.
      console.warn("[push] auto sign-out dedupe insert failed, sending anyway", {
        userId: uid,
        attendanceId: attId,
        error: insertErr.message,
      });
    } else if (!inserted) {
      // Shouldn't normally happen, but if the insert returned no row treat it
      // as already-notified to be safe.
      return;
    }
  }

  const res = await sendPushToUsers([uid], TITLE, BODY, {
    type: "attendance_auto_sign_out",
    screen: "geo_attendance",
    reason: reasonStr,
    ...(attId ? { attendance_id: attId } : {}),
  });
  if (!res.sent) {
    console.warn("[push] attendance auto sign-out not sent", {
      userId: uid,
      attendanceId: attId || undefined,
      reason: reasonStr,
      error: res.error ?? "missing ONESIGNAL_REST_API_KEY or OneSignal error",
    });
  }
}
