import { NextResponse } from "next/server";
import { isAttendanceCronAuthorized } from "@/lib/attendanceCronAuth";
import { dispatchAssetInspectionReminders } from "@/lib/assetInspectionReminders";

export const dynamic = "force-dynamic";

async function run(req: Request): Promise<NextResponse> {
  if (!isAttendanceCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatchAssetInspectionReminders(100);
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
