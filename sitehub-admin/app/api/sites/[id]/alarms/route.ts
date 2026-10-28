import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { writeAuditLog } from "@/lib/auditLog";
import { sendPushToUsers } from "@/lib/onesignal";
import { getServerPublicOrigin } from "@/lib/url";
import { currentSignedInSiteId } from "@/lib/auth/siteScope";
import { staffIdsForSite, userIdsSignedInAtSite } from "@/lib/auth/siteAudience";
import { alarmView, isStaffForSite, loadActiveAlarm, loadSite, personDetails } from "@/lib/siteAlarms/service";
import {
  MAX_NOTE_LENGTH,
  alarmPushContent,
  isAlarmType,
  roleLabel,
  type AudienceMember,
  type SiteAlarmRow,
} from "@/lib/siteAlarms/types";

const RAISE_LIMIT = 6;
const RAISE_WINDOW_MS = 10 * 60 * 1000;

function coordinate(value: unknown, limit: number): number | null {
  const n = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

/**
 * Raise an alarm. Anyone signed in to the site, or staff for it. A second raise while an
 * alarm is active joins it (listed under "Also raised by") and sends no further pushes.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: siteId } = await params;
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const uid = (auth.uid ?? "").trim();
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const site = await loadSite(siteId);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const [staff, signedInSite] = await Promise.all([isStaffForSite(auth, site), currentSignedInSiteId(uid)]);
    if (!staff && signedInSite !== site.id) {
      return NextResponse.json({ error: "Only people signed in to this site can raise its alarm" }, { status: 403 });
    }

    const limit = await checkRateLimit(`site-alarm:${uid}`, RAISE_LIMIT, RAISE_WINDOW_MS);
    if (!limit.success) {
      return NextResponse.json({ error: "Too many alarms raised. Call 999 if this is an emergency." }, { status: 429 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (!isAlarmType(body.type)) return NextResponse.json({ error: "Choose an alarm type" }, { status: 400 });
    const isDrill = body.isDrill === true || body.is_drill === true;
    if (isDrill && !staff) return NextResponse.json({ error: "Only supervisors and admins can start a drill" }, { status: 403 });
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, MAX_NOTE_LENGTH) : null;
    const lat = coordinate(body.lat, 90);
    const lng = lat === null ? null : coordinate(body.lng, 180);

    const caller = (await personDetails([uid])).get(uid);
    const callerName = caller?.name ?? "Someone";
    const callerRole = roleLabel(caller?.role ?? auth.role) || null;

    const existing = await loadActiveAlarm(site.id);
    if (existing) return NextResponse.json(await joinAlarm(existing, site, uid, callerName, callerRole, staff));

    const [onSiteIds, staffIds] = await Promise.all([userIdsSignedInAtSite(site.id), staffIdsForSite(site.company_id, site.id)]);
    const audienceIds = [...new Set([...onSiteIds, ...staffIds, uid])];
    const people = await personDetails(audienceIds);
    const onSite = new Set(onSiteIds);
    const staffSet = new Set(staffIds);
    const snapshot: AudienceMember[] = audienceIds.map((id) => ({
      user_id: id,
      name: people.get(id)?.name ?? "Unknown",
      role: people.get(id)?.role ?? null,
      on_site: onSite.has(id),
      staff: staffSet.has(id),
    }));

    const { data: inserted, error } = await supabaseAdmin
      .from("site_alarms")
      .insert({
        company_id: site.company_id,
        site_id: site.id,
        type: body.type,
        is_drill: isDrill,
        raised_by: uid,
        raised_by_name: callerName,
        raised_by_role: callerRole,
        raised_lat: lat,
        raised_lng: lat === null ? null : lng,
        note,
        audience_snapshot: snapshot,
      })
      .select("*")
      .single();

    if (error) {
      // Someone else raised it a moment earlier: join theirs.
      if (error.code === "23505") {
        const raced = await loadActiveAlarm(site.id);
        if (raced) return NextResponse.json(await joinAlarm(raced, site, uid, callerName, callerRole, staff));
      }
      console.error("POST /api/sites/[id]/alarms insert:", error);
      return NextResponse.json({ error: "Couldn't raise the alarm. Use the nearest call point and call 999." }, { status: 500 });
    }

    const alarm = inserted as SiteAlarmRow;
    const { title, body: message } = alarmPushContent(alarm, site.name);
    const pushTargets = audienceIds.filter((id) => id !== uid);
    const push = pushTargets.length
      ? await sendPushToUsers(
          pushTargets,
          title,
          message,
          { type: "site_alarm", screen: "site_alarm", alarmId: alarm.id, siteId: site.id },
          {
            urgent: { ttlSeconds: 3600 },
            groupId: `site-alarm-${alarm.id}`,
            webUrl: `${getServerPublicOrigin()}/dashboard/health-and-safety/alarms/${alarm.id}`,
          },
        )
      : { sent: false, error: "Nobody else to notify" };
    if (!push.sent && pushTargets.length) console.error("Site alarm push failed:", push.error);

    void writeAuditLog({
      userId: uid,
      action: "site_alarm_raised",
      timestamp: new Date(),
      actorId: uid,
      actorEmail: auth.userEmail,
      metadata: { alarmId: alarm.id, siteId: site.id, type: alarm.type, isDrill, notified: pushTargets.length },
    });

    return NextResponse.json({
      joined: false,
      notified: pushTargets.length,
      alarm: await alarmView(alarm, site, { callerId: uid, staff, withPlan: true }),
    });
  } catch (e) {
    console.error("POST /api/sites/[id]/alarms failed:", e);
    return NextResponse.json({ error: "Couldn't raise the alarm. Use the nearest call point and call 999." }, { status: 500 });
  }
}

async function joinAlarm(
  alarm: SiteAlarmRow,
  site: NonNullable<Awaited<ReturnType<typeof loadSite>>>,
  uid: string,
  name: string,
  role: string | null,
  staff: boolean,
) {
  const raisers = Array.isArray(alarm.additional_raisers) ? alarm.additional_raisers : [];
  let current = alarm;
  if (alarm.raised_by !== uid && !raisers.some((r) => r.user_id === uid)) {
    const next = [...raisers, { user_id: uid, name, role, raised_at: new Date().toISOString() }];
    const { data } = await supabaseAdmin
      .from("site_alarms")
      .update({ additional_raisers: next })
      .eq("id", alarm.id)
      .eq("status", "active")
      .select("*")
      .maybeSingle();
    if (data) current = data as SiteAlarmRow;
  }
  return { joined: true, notified: 0, alarm: await alarmView(current, site, { callerId: uid, staff, withPlan: true }) };
}
