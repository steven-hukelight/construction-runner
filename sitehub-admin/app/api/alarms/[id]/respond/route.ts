import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { alarmAccess, loadAlarm, loadSite } from "@/lib/siteAlarms/service";
import { isResponseStatus } from "@/lib/siteAlarms/types";

function coordinate(value: unknown, limit: number): number | null {
  const n = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

/** The caller's own muster status: safe, need help, or (medical alarms) first aider responding. */
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
    if (!(await alarmAccess(auth, alarm, site)).allowed) return NextResponse.json({ error: "Alarm not found" }, { status: 404 });
    if (alarm.status !== "active") return NextResponse.json({ error: "This alarm has been stood down" }, { status: 409 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (!isResponseStatus(body.status)) return NextResponse.json({ error: "Choose safe or need help" }, { status: 400 });
    if (body.status === "responding" && alarm.type !== "medical") {
      return NextResponse.json({ error: "First aider responses are for medical alarms" }, { status: 400 });
    }
    const lat = coordinate(body.lat, 90);
    const lng = lat === null ? null : coordinate(body.lng, 180);

    const respondedAt = new Date().toISOString();
    const { error } = await supabaseAdmin.from("site_alarm_responses").upsert(
      { alarm_id: alarm.id, user_id: uid, status: body.status, responded_at: respondedAt, lat, lng: lat === null ? null : lng },
      { onConflict: "alarm_id,user_id" },
    );
    if (error) {
      console.error("POST /api/alarms/[id]/respond:", error);
      return NextResponse.json({ error: "Couldn't save your response" }, { status: 500 });
    }
    return NextResponse.json({ status: body.status, responded_at: respondedAt });
  } catch (e) {
    console.error("POST /api/alarms/[id]/respond failed:", e);
    return NextResponse.json({ error: "Couldn't save your response" }, { status: 500 });
  }
}
