import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { findUserByIdOrEmail } from "@/lib/auth/findUser";
import { listAssignedSitesForUser } from "@/lib/induction/listAssignedSites";

export const dynamic = "force-dynamic";

/**
 * Sites the caller was added to (assigned_operatives).
 * Attendance Select site and My Inductions use this for operatives.
 */
export async function GET(req: Request) {
  try {
    const auth = await resolveMobileApiAuth(req);
    const url = new URL(req.url);
    const uid = auth.uid ?? url.searchParams.get("uid");
    const email = auth.userEmail;
    if (!uid && !email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userData = await findUserByIdOrEmail({ id: uid, email });
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = String(userData.id ?? "");
    const roleLower = String(auth.role ?? userData.role ?? "").toLowerCase();
    const queryCompany = url.searchParams.get("companyId")?.trim();
    let companyId =
      (userData.company_id as string | null | undefined) ??
      (userData.companyId as string | null | undefined) ??
      auth.companyId ??
      null;
    if (roleLower === "superuser" && queryCompany) companyId = queryCompany;

    const sites = await listAssignedSitesForUser(userId, { companyId });
    return NextResponse.json(sites);
  } catch (e) {
    console.error("GET /api/me/assigned-sites failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
