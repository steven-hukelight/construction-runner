import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { alarmAccess, alarmView, loadAlarm, loadResponses, loadSite, personDetails } from "@/lib/siteAlarms/service";
import { buildMusterBoard } from "@/lib/siteAlarms/types";

/**
 * One alarm. Staff also get the muster board: everyone signed in when it went off,
 * grouped into unaccounted, need help, responding and safe. `?plan=0` skips the plan.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const alarm = await loadAlarm(id);
    const site = alarm ? await loadSite(alarm.site_id) : null;
    if (!alarm || !site) return NextResponse.json({ error: "Alarm not found" }, { status: 404 });

    const access = await alarmAccess(auth, alarm, site);
    if (!access.allowed) return NextResponse.json({ error: "Alarm not found" }, { status: 404 });

    const withPlan = new URL(req.url).searchParams.get("plan") !== "0";
    const view = await alarmView(alarm, site, { callerId: auth.uid, staff: access.staff, withPlan });
    if (!access.staff) return NextResponse.json({ alarm: view });

    const responses = await loadResponses(alarm.id);
    const strangers = responses.map((r) => r.user_id).filter((uid) => !(alarm.audience_snapshot ?? []).some((m) => m.user_id === uid));
    const names = await personDetails(strangers);
    return NextResponse.json({ alarm: view, board: buildMusterBoard(alarm.audience_snapshot ?? [], responses, names) });
  } catch (e) {
    console.error("GET /api/alarms/[id] failed:", e);
    return NextResponse.json({ error: "Couldn't load the alarm" }, { status: 500 });
  }
}
