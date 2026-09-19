import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { ackInductionStep } from "@/lib/induction/inductionProgress";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await resolveMobileApiAuth(req);
    if (!auth.uid) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const siteId = String(body.siteId ?? body.site_id ?? "").trim();
    const kind = String(body.kind ?? "").trim();
    if (!siteId || (kind !== "safety" && kind !== "rules")) {
      return NextResponse.json({ error: "siteId and kind (safety|rules) required" }, { status: 400 });
    }
    await ackInductionStep({ userId: auth.uid, siteId, kind });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/induction/ack:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
