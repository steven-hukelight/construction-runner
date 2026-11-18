import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { canAssignOperativesToSites, canEditWorkCatalogue, canViewTeamAttendance, usesAssignedSites } from "@/lib/auth/roles";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { userIdsSignedInAtSite } from "@/lib/auth/siteAudience";
import {
  addNameList,
  addNames,
  addPlotRun,
  catchUpSegment,
  closeMySegment,
  loadCatalogue,
  openSegmentFor,
  recentChoices,
  removeName,
  removeNames,
  siteOwnerId,
  startSegment,
  todayBoard,
} from "@/lib/worklog/service";

export const dynamic = "force-dynamic";

async function callerCanUseSite(uid: string | null, role: string | null, companyId: string | null, siteId: string, owner: string) {
  if (role === "superuser") return true;
  if (usesAssignedSites(role)) {
    if (!uid) return false;
    const { data } = await supabaseAdmin.from("user_sites").select("user_id").eq("site_id", siteId).eq("user_id", uid).maybeSingle();
    return Boolean(data);
  }
  return Boolean(companyId && companyId === owner);
}

export async function GET(req: Request) {
  const auth = await resolveMobileApiAuth(req);
  if (auth instanceof NextResponse) return auth;
  const siteId = new URL(req.url).searchParams.get("siteId")?.trim() ?? "";
  if (!siteId) return NextResponse.json({ error: "Choose a site" }, { status: 400 });
  try {
    const owner = await siteOwnerId(siteId);
    if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const staff = await callerCanUseSite(auth.uid, auth.role, auth.companyId, siteId, owner);
    if (!staff) {
      if (!auth.uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const onSite = await userIdsSignedInAtSite(siteId);
      if (!onSite.includes(auth.uid)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const catalogue = await loadCatalogue(siteId);
    const uid = auth.uid ?? "";
    const [open, recent] = uid
      ? await Promise.all([openSegmentFor(uid, siteId), recentChoices(uid, siteId)])
      : [null, [] as Awaited<ReturnType<typeof recentChoices>>];
    const last = recent[0] ? { placeId: recent[0].placeId, activityId: recent[0].activityId } : null;
    const office = canViewTeamAttendance(auth.role) && staff;
    const board = office ? await todayBoard(siteId) : null;
    return NextResponse.json({
      ...catalogue,
      open,
      last,
      recent,
      board,
      canEdit: canEditWorkCatalogue(auth.role, staff),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load places";
    console.error("GET /api/work-log:", message);
    return NextResponse.json({ error: "Couldn't load places" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await resolveMobileApiAuth(req);
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const siteId = String(body?.siteId ?? "").trim();
  const action = String(body?.action ?? "").trim();
  if (!siteId) return NextResponse.json({ error: "Choose a site" }, { status: 400 });
  const owner = await siteOwnerId(siteId);
  if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const staff = await callerCanUseSite(auth.uid, auth.role, auth.companyId, siteId, owner);
  const canEdit = canEditWorkCatalogue(auth.role, staff);
  if (usesAssignedSites(auth.role) && !staff) {
    return NextResponse.json({ error: "You can't change this list" }, { status: 403 });
  }

  try {
    if (action === "add-places" || action === "add-activities") {
      if (!canEdit) {
        return NextResponse.json({ error: "You can't change this list" }, { status: 403 });
      }
      const table = action === "add-places" ? "work_places" : "work_activities";
      const count = Array.isArray(body?.names)
        ? await addNameList(siteId, owner, table, body.names.map((name) => String(name)))
        : await addNames(siteId, owner, table, String(body?.names ?? ""));
      if (!count) return NextResponse.json({ error: "Type at least one name" }, { status: 400 });
      return NextResponse.json({ ok: true, count });
    }

    if (action === "add-plot-run") {
      if (!canEdit) {
        return NextResponse.json({ error: "You can't change this list" }, { status: 403 });
      }
      const count = await addPlotRun(siteId, owner, {
        block: String(body?.block ?? ""),
        core: String(body?.core ?? ""),
        from: Number(body?.from),
        to: Number(body?.to),
        pad: Boolean(body?.pad),
      });
      if (!count) return NextResponse.json({ error: "Check the plot numbers" }, { status: 400 });
      return NextResponse.json({ ok: true, count });
    }

    if (action === "remove-place" || action === "remove-activity") {
      if (!canEdit) {
        return NextResponse.json({ error: "You can't change this list" }, { status: 403 });
      }
      const table = action === "remove-place" ? "work_places" : "work_activities";
      await removeName(siteId, owner, table, String(body?.id ?? ""));
      return NextResponse.json({ ok: true });
    }

    if (action === "remove-places") {
      if (!canEdit) {
        return NextResponse.json({ error: "You can't change this list" }, { status: 403 });
      }
      const ids = Array.isArray(body?.ids) ? body.ids.map((id) => String(id)) : [];
      const result = await removeNames(siteId, owner, "work_places", ids);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "close") {
      if (!auth.uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      await closeMySegment(auth.uid);
      return NextResponse.json({ ok: true });
    }

    if (action === "start" || action === "catch-up") {
      const placeId = String(body?.placeId ?? "").trim();
      const activityId = String(body?.activityId ?? "").trim();
      const requested = String(body?.userId ?? auth.uid ?? "").trim();
      if (!requested) return NextResponse.json({ error: "Choose a person" }, { status: 400 });
      if (requested !== auth.uid && (!staff || !canAssignOperativesToSites(auth.role))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const input = {
        siteId,
        companyId: owner,
        userId: requested,
        placeId,
        activityId,
        loggedBy: auth.uid,
      };
      if (action === "catch-up") await catchUpSegment(input);
      else await startSegment(input);
      const extra = Array.isArray(body?.userIds) ? body.userIds.map((id) => String(id)) : [];
      if (extra.length && staff && canAssignOperativesToSites(auth.role)) {
        for (const userId of extra) {
          if (!userId || userId === requested) continue;
          if (action === "catch-up") await catchUpSegment({ ...input, userId });
          else await startSegment({ ...input, userId });
        }
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't save";
    const status =
      message.includes("Sign in") ||
      message.includes("Choose") ||
      message.includes("Visits") ||
      message.includes("Type at least") ||
      message.includes("Check the plot")
        ? 400
        : 500;
    if (status === 500) console.error("POST /api/work-log:", message);
    return NextResponse.json({ error: status === 400 ? message : "Couldn't save" }, { status });
  }
}
