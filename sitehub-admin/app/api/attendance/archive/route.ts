/**
 * Attendance archive: GET reads from attendance_archive; cron GET / POST
 * archives live rows older than UK midnight and clears the live list.
 * Vercel Cron calls GET at 00:00 and 23:00 UTC (covers GMT and BST midnight).
 * A signed-in POST ("Clear Day") needs `{ confirm: true }`, only touches the caller's
 * company and assigned sites, and leaves anyone still signed in on the live list.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { enrichAttendanceApiFields } from "@/lib/attendanceRowEnrich";
import { isAttendanceCronAuthorized } from "@/lib/attendanceCronAuth";
import { runAttendanceDailyArchive, runManualAttendanceArchive } from "@/lib/attendanceArchiveRun";
import { londonYmd, parseYmd } from "@/lib/attendanceLondonDay";
import { canViewTeamAttendance } from "@/lib/auth/roles";
import { getRestrictedSiteIds, resolveCallerUserId } from "@/lib/auth/siteScope";
import { resolvePreInductionAuth } from "@/app/api/pre-induction/_utils/mobileAuth";

async function normalizeArchiveRows(rows: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
  if (!rows.length) return [];
  const userIds = [...new Set(rows.map((r) => r.user_id as string).filter(Boolean))];
  const siteIds = [...new Set(rows.map((r) => r.site_id as string).filter(Boolean))];
  const [usersRes, sitesRes] = await Promise.all([
    userIds.length ? supabaseAdmin.from("users").select("id, name, display_name, email, company_id").in("id", userIds) : { data: [] },
    siteIds.length ? supabaseAdmin.from("sites").select("id, name").in("id", siteIds) : { data: [] },
  ]);
  const userMap = new Map<string, { name?: string; display_name?: string; email?: string; company_id?: string }>();
  (usersRes.data ?? []).forEach((u: Record<string, unknown>) => {
    userMap.set(String(u.id), u as { name?: string; display_name?: string; email?: string; company_id?: string });
  });
  const siteMap = new Map<string, { name?: string }>();
  (sitesRes.data ?? []).forEach((s: Record<string, unknown>) => {
    siteMap.set(String(s.id), s as { name?: string });
  });
  return rows.map((r) => {
    const uid = r.user_id as string;
    const sid = r.site_id as string;
    const user = uid ? userMap.get(String(uid)) : null;
    const site = sid ? siteMap.get(String(sid)) : null;
    const name =
      (user?.display_name && String(user.display_name).trim()) ||
      (user?.name && !String(user.name).includes("@") ? String(user.name).trim() : "") ||
      (user?.email ? String(user.email).split("@")[0] : null);
    const rowCompanyId = r.company_id as string | undefined;
    const companyId = (rowCompanyId && String(rowCompanyId).trim()) ? rowCompanyId : (user?.company_id ? String(user.company_id) : undefined);
    return enrichAttendanceApiFields({
      ...r,
      userId: r.user_id,
      operativeId: r.user_id,
      siteId: r.site_id,
      companyId: companyId ?? rowCompanyId,
      company_id: companyId ?? rowCompanyId ?? r.company_id,
      name: name ?? r.name,
      siteName: site?.name ?? r.siteName ?? r.site_name,
    });
  });
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    if (isAttendanceCronAuthorized(req)) {
      const result = await runAttendanceDailyArchive();
      return NextResponse.json(result);
    }

    const cookieStore = await cookies();
    const mobileAuth = await resolvePreInductionAuth({ req });
    let role = cookieStore.get("role")?.value ?? mobileAuth.role ?? undefined;
    let companyId = cookieStore.get("companyId")?.value ?? mobileAuth.companyId ?? undefined;
    if ((!role || !companyId) && role !== "superuser") {
      const email = cookieStore.get("user_email")?.value;
      if (email) {
        const { data: users } = await supabaseAdmin.from("users").select("id, role, company_id").eq("email", email).limit(1);
        if (users?.length) {
          const u = users[0];
          if (!role) role = u.role ?? undefined;
          if (!companyId && u.company_id) companyId = String(u.company_id).trim() || undefined;
        }
      }
    }
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date")?.trim();
    const limit = Math.min(500, parseInt(url.searchParams.get("limit") || "200") || 200);
    if (!dateParam) {
      return NextResponse.json({ error: "date (YYYY-MM-DD) required" }, { status: 400 });
    }
    if (!parseYmd(dateParam)) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    const isSuperuser = role === "superuser";
    if (isSuperuser) {
      companyId = url.searchParams.get("companyId") ?? companyId ?? undefined;
    }
    let q = supabaseAdmin
      .from("attendance_archive")
      .select("*")
      .eq("archive_date", dateParam)
      .order("timestamp", { ascending: false })
      .limit(limit);
    const callerId = (await resolveCallerUserId()) ?? mobileAuth.uid ?? null;
    if (!canViewTeamAttendance(role)) {
      if (!callerId) return NextResponse.json([]);
      q = q.eq("user_id", callerId);
    } else {
      if (!companyId && !isSuperuser) return NextResponse.json([]);
      if (companyId) {
        const { data: users } = await supabaseAdmin.from("users").select("id").eq("company_id", companyId);
        const userIds = (users ?? []).map((u) => u.id);
        if (userIds.length === 0) return NextResponse.json([]);
        q = q.in("user_id", userIds);
      }
      const restrictedSites = await getRestrictedSiteIds(role, callerId);
      if (restrictedSites) {
        if (restrictedSites.length === 0) return NextResponse.json([]);
        q = q.in("site_id", restrictedSites);
      }
    }
    const { data } = await q;
    const normalized = await normalizeArchiveRows((data ?? []) as Record<string, unknown>[]);
    return NextResponse.json(normalized);
  } catch (e) {
    console.error("GET /api/attendance/archive failed:", e);
    if (isAttendanceCronAuthorized(req)) {
      return NextResponse.json({ error: "Archive failed" }, { status: 500 });
    }
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date")?.trim();
    if (dateParam && !parseYmd(dateParam)) {
      return NextResponse.json({ error: "Invalid date format (use YYYY-MM-DD)" }, { status: 400 });
    }

    if (isAttendanceCronAuthorized(req)) {
      const result = await runAttendanceDailyArchive({
        dateYmd: dateParam || undefined,
      });
      return NextResponse.json(result);
    }

    const cookieStore = await cookies();
    const mobileAuth = await resolvePreInductionAuth({ req });
    const role = (cookieStore.get("role")?.value ?? mobileAuth.role ?? "").toLowerCase();
    if (!canViewTeamAttendance(role)) {
      return NextResponse.json({ error: "Only supervisors and admins can clear the day" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as { confirm?: unknown };
    if (body.confirm !== true) {
      return NextResponse.json({ error: "Clearing the day needs confirming" }, { status: 400 });
    }

    const companyId =
      role === "superuser"
        ? url.searchParams.get("companyId")?.trim() || cookieStore.get("companyId")?.value?.trim()
        : cookieStore.get("companyId")?.value?.trim() || mobileAuth.companyId?.trim();
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { data: users, error: usersErr } = await supabaseAdmin.from("users").select("id").eq("company_id", companyId);
    if (usersErr) throw new Error(usersErr.message);
    const callerId = (await resolveCallerUserId()) ?? mobileAuth.uid ?? null;
    const siteIds = await getRestrictedSiteIds(role, callerId);

    const result = await runManualAttendanceArchive({
      dateYmd: dateParam || londonYmd(),
      userIds: (users ?? []).map((u) => String(u.id)),
      siteIds,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("Attendance archive failed:", e);
    const message = e instanceof Error ? e.message : "Archive failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
