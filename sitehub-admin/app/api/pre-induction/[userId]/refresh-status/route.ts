import { NextResponse } from "next/server";
import { checkPreInductionAccess } from "../_utils/auth";
import { updatePreInductionStatus } from "../_utils/status";

/** POST: Recompute pre_induction_status for user. Call after saving sections (e.g. from mobile app). */
export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const access = await checkPreInductionAccess(userId, req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
    }
    await updatePreInductionStatus(userId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Refresh failed";
    console.error("pre-induction refresh-status:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
