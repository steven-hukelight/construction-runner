import { NextResponse } from "next/server";
import { dispatchPendingAttendancePushNotifications } from "@/lib/dispatchAttendancePushQueue";

export const dynamic = "force-dynamic";

async function run(req: Request): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized: Bearer CRON_SECRET required" }, { status: 401 });
  }
  const result = await dispatchPendingAttendancePushNotifications(80);
  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    ...result,
  });
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
