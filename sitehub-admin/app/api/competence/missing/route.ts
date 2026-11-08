import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { canViewTeamAttendance } from "@/lib/auth/roles";
import { missingCompetenceAtSite, resolveSiteAccess } from "@/lib/competence/service";

export const dynamic = "force-dynamic";

/** GET ?siteId=… — people signed in at the site now who lack a card or ticket their RAMS or task needs. */
export async function GET(req: Request) {
  const auth = await resolveMobileApiAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!canViewTeamAttendance(auth.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const siteId = (new URL(req.url).searchParams.get("siteId") ?? "").trim();
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });
  const access = await resolveSiteAccess(siteId, auth);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const result = await missingCompetenceAtSite(access, auth.companyId);
    return NextResponse.json({ site: { id: access.siteId, name: access.siteName }, ...result });
  } catch (e) {
    console.error("GET /api/competence/missing:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not load" }, { status: 500 });
  }
}
