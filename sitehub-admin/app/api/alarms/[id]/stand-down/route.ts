import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { writeAuditLog } from "@/lib/auditLog";
import { sendPushToUsers } from "@/lib/onesignal";
import { getServerPublicOrigin } from "@/lib/url";
import { staffIdsForSite, userIdsSignedInAtSite } from "@/lib/auth/siteAudience";
import { alarmView, isStaffForSite, loadAlarm, loadSite, personDetails } from "@/lib/siteAlarms/service";
import { MAX_NOTE_LENGTH, allClearPushContent, isStandDownOutcome, type SiteAlarmRow } from "@/lib/siteAlarms/types";

/** Staff only. Ends the alarm and sends an all-clear to everyone who was alerted plus anyone on site now. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const uid = (auth.uid ?? "").trim();
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const alarm = await loadAlarm(id);
    const site = alarm ? await loadSite(alarm.site_id) : null;
    if (!alarm || !site) return NextResponse.json({ error: "Alarm not found" }, { status: 404 });
    if (!(await isStaffForSite(auth, site))) {
      return NextResponse.json({ error: "Only supervisors and admins for this site can stand the alarm down" }, { status: 403 });
    }
    if (alarm.status !== "active") return NextResponse.json({ error: "This alarm has already been stood down" }, { status: 409 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, MAX_NOTE_LENGTH) : "";
    if (!reason) return NextResponse.json({ error: "Add a reason for standing down" }, { status: 400 });
    const outcome = isStandDownOutcome(body.outcome) ? body.outcome : alarm.is_drill ? "drill" : "genuine";

    const me = (await personDetails([uid])).get(uid);
    const { data: updated, error } = await supabaseAdmin
      .from("site_alarms")
      .update({
        status: "stood_down",
        stood_down_by: uid,
        stood_down_by_name: me?.name ?? "A supervisor",
        stood_down_at: new Date().toISOString(),
        stand_down_reason: reason,
        outcome,
        is_drill: alarm.is_drill || outcome === "drill",
      })
      .eq("id", alarm.id)
      .eq("status", "active")
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("POST /api/alarms/[id]/stand-down:", error);
      return NextResponse.json({ error: "Couldn't stand the alarm down" }, { status: 500 });
    }
    if (!updated) return NextResponse.json({ error: "This alarm has already been stood down" }, { status: 409 });
    const done = updated as SiteAlarmRow;

    const [onSiteNow, staffNow] = await Promise.all([userIdsSignedInAtSite(site.id), staffIdsForSite(site.company_id, site.id)]);
    const targets = [
      ...new Set([...(alarm.audience_snapshot ?? []).map((m) => m.user_id), ...onSiteNow, ...staffNow]),
    ].filter((id) => id !== uid);
    if (targets.length) {
      const { title, body: message } = allClearPushContent(done, site.name);
      const push = await sendPushToUsers(
        targets,
        title,
        message,
        { type: "site_alarm_all_clear", screen: "site_alarm", alarmId: done.id, siteId: site.id },
        {
          groupId: `site-alarm-${done.id}`,
          webUrl: `${getServerPublicOrigin()}/dashboard/health-and-safety/alarms/${done.id}`,
        },
      );
      if (!push.sent) console.error("Site alarm all-clear push failed:", push.error);
    }

    void writeAuditLog({
      userId: uid,
      action: "site_alarm_stood_down",
      timestamp: new Date(),
      actorId: uid,
      actorEmail: auth.userEmail,
      metadata: { alarmId: done.id, siteId: site.id, outcome, reason },
    });

    return NextResponse.json({ alarm: await alarmView(done, site, { callerId: uid, staff: true }) });
  } catch (e) {
    console.error("POST /api/alarms/[id]/stand-down failed:", e);
    return NextResponse.json({ error: "Couldn't stand the alarm down" }, { status: 500 });
  }
}
