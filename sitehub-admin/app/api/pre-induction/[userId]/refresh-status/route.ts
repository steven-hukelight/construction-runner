import { NextResponse } from "next/server";
import { authorizeActingOnUser } from "@/lib/auth/actingOnUser";
import { updatePreInductionStatus } from "../_utils/status";

/** POST: Recompute pre_induction_status for user. Call after saving sections (e.g. from mobile app). */
export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId: requestedUserId } = await params;
    const access = await authorizeActingOnUser(req, requestedUserId);
    if (!access.ok) return access.response;
    const userId = access.targetUserId;
    await updatePreInductionStatus(userId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Refresh failed";
    console.error("pre-induction refresh-status:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
