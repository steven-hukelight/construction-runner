import { NextResponse } from "next/server";
import { isAttendanceAlertsDispatchAuthorized } from "@/lib/attendanceCronAuth";
import { dispatchAttendanceAlerts } from "@/lib/attendanceAlerts/dispatch";

export const dynamic = "force-dynamic";

async function run(req: Request): Promise<NextResponse> {
  if (!isAttendanceAlertsDispatchAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatchAttendanceAlerts();
  if (result.errors.length > 0) {
    console.warn("[attendance-alerts] dispatch errors:", result.errors);
  }
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ...result });
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
