import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { getInductionProgress } from "@/lib/induction/inductionProgress";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const url = new URL(req.url);
    const userId = (url.searchParams.get("userId") ?? auth.uid ?? "").trim();
    const siteId = (url.searchParams.get("siteId") ?? "").trim();
    if (!auth.uid && !auth.userEmail) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!userId || !siteId) {
      return NextResponse.json({ error: "userId and siteId required" }, { status: 400 });
    }
    if (auth.uid && userId !== auth.uid) {
      const role = (auth.role ?? "").toLowerCase();
      if (!["superuser", "admin", "supervisor", "site_admin"].includes(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    const progress = await getInductionProgress({
      userId,
      siteId,
      companyId: auth.companyId,
      ensureSafetyCopy: url.searchParams.get("ensure") !== "0",
    });
    if (!progress) return NextResponse.json({ error: "Site not found" }, { status: 404 });
    return NextResponse.json(progress);
  } catch (e) {
    console.error("GET /api/induction/progress:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
