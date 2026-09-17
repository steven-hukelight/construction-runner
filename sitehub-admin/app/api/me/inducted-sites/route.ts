import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolvePreInductionAuth } from "@/app/api/pre-induction/_utils/mobileAuth";
import { findUserByIdOrEmail } from "@/lib/auth/findUser";
import { listInductedSitesForUser } from "@/lib/induction/listInductedSites";

export const dynamic = "force-dynamic";

/**
 * Sites the caller has a currently valid completed induction for.
 * Used by app Select site / matching self-service pickers.
 * My Inductions must keep using GET /api/sites.
 */
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const url = new URL(req.url);
    const mobileAuth = await resolvePreInductionAuth({
      req,
      uidFromQuery: url.searchParams.get("uid"),
    });
    const email = cookieStore.get("user_email")?.value ?? mobileAuth.userEmail;
    const role = cookieStore.get("role")?.value ?? mobileAuth.role;
    const uid = cookieStore.get("uid")?.value ?? mobileAuth.uid;
    if (!email && !uid) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userData = await findUserByIdOrEmail({ id: uid, email });
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = String(userData.id ?? "");
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const roleLower = String(role ?? userData.role ?? "").toLowerCase();
    const queryCompany = url.searchParams.get("companyId")?.trim();
    let companyId =
      (userData.company_id as string | null | undefined) ??
      (userData.companyId as string | null | undefined) ??
      mobileAuth.companyId ??
      cookieStore.get("companyId")?.value ??
      null;
    if (roleLower === "superuser" && queryCompany) {
      companyId = queryCompany;
    }

    const sites = await listInductedSitesForUser(userId, { companyId });
    return NextResponse.json(sites);
  } catch (e) {
    console.error("GET /api/me/inducted-sites failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
