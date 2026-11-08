import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { canAssignOperativesToSites, canViewTeamAttendance } from "@/lib/auth/roles";
import { parseRequirement, requirementLabel, type Requirement } from "@/lib/competence/rules";
import { loadRequirements, loadSubject, saveRequirements, type RequirementRow, type SubjectType } from "@/lib/competence/service";

export const dynamic = "force-dynamic";

const MAX_REQUIREMENTS = 12;

function subjectFrom(value: unknown): SubjectType | null {
  return value === "rams" || value === "task" ? value : null;
}

function present(rows: RequirementRow[]) {
  return rows.map((r) => ({ id: r.id, kind: r.kind, code: r.code, level: r.level ?? null, label: requirementLabel(r) }));
}

/** GET ?subjectType=rams|task&subjectId=… — cards and tickets this RAMS or task needs. */
export async function GET(req: Request) {
  const auth = await resolveMobileApiAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!canViewTeamAttendance(auth.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const subjectType = subjectFrom(url.searchParams.get("subjectType"));
  const subjectId = (url.searchParams.get("subjectId") ?? "").trim();
  if (!subjectType || !subjectId) return NextResponse.json({ error: "subjectType and subjectId required" }, { status: 400 });
  const subject = await loadSubject(subjectType, subjectId, auth);
  if (!subject) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const rows = await loadRequirements(subjectType, [subjectId]);
    return NextResponse.json({ requirements: present(rows), canEdit: canAssignOperativesToSites(auth.role) });
  } catch (e) {
    console.error("GET /api/competence/requirements:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not load requirements" }, { status: 500 });
  }
}

/** PUT { subjectType, subjectId, requirements: [{ kind, code, level? }] } — replaces the list. */
export async function PUT(req: Request) {
  const auth = await resolveMobileApiAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!canAssignOperativesToSites(auth.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const subjectType = subjectFrom(body?.subjectType);
  const subjectId = typeof body?.subjectId === "string" ? body.subjectId.trim() : "";
  if (!subjectType || !subjectId) return NextResponse.json({ error: "subjectType and subjectId required" }, { status: 400 });
  const raw = Array.isArray(body?.requirements) ? body.requirements : null;
  if (!raw) return NextResponse.json({ error: "requirements must be a list" }, { status: 400 });
  if (raw.length > MAX_REQUIREMENTS) {
    return NextResponse.json({ error: `Up to ${MAX_REQUIREMENTS} requirements` }, { status: 400 });
  }
  const items: Requirement[] = [];
  for (const value of raw) {
    const parsed = parseRequirement(value);
    if (!parsed) return NextResponse.json({ error: "One of the requirements is not valid" }, { status: 400 });
    items.push(parsed);
  }
  const subject = await loadSubject(subjectType, subjectId, auth);
  if (!subject) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const rows = await saveRequirements({
      subjectType,
      subjectId,
      companyId: subject.company_id,
      items,
      userId: auth.uid,
    });
    return NextResponse.json({ requirements: present(rows) });
  } catch (e) {
    console.error("PUT /api/competence/requirements:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not save requirements" }, { status: 500 });
  }
}
