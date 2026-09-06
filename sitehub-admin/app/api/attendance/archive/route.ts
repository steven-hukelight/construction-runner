/**
 * Attendance archive: GET reads from attendance_archive; cron GET / POST
 * archives live rows older than UK midnight and clears the live list.
 * Vercel Cron calls GET at 00:00 and 23:00 UTC (covers GMT and BST midnight).
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { enrichAttendanceApiFields } from "@/lib/attendanceRowEnrich";
import { isAttendanceCronAuthorized } from "@/lib/attendanceCronAuth";
import { runAttendanceDailyArchive } from "@/lib/attendanceArchiveRun";
import { parseYmd } from "@/lib/attendanceLondonDay";

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
    const name = user?.name || user?.display_name || (user?.email ? String(user.email).split("@")[0] : null);
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
    let role = cookieStore.get("role")?.value;
    let companyId = cookieStore.get("companyId")?.value;
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
    if (role === "superuser") {
      companyId = url.searchParams.get("companyId") ?? companyId ?? undefined;
    }
    let q = supabaseAdmin
      .from("attendance_archive")
      .select("*")
      .eq("archive_date", dateParam)
      .order("timestamp", { ascending: false })
      .limit(limit);
    if (companyId) {
      const { data: users } = await supabaseAdmin.from("users").select("id").eq("company_id", companyId);
      const userIds = (users ?? []).map((u) => u.id);
      if (userIds.length === 0) return NextResponse.json([]);
      q = q.in("user_id", userIds);
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
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    const allowedByCron = isAttendanceCronAuthorized(req);
    const allowedBySuperuser = role === "superuser";
    const allowedBySupervisor = ["supervisor", "admin"].includes((role ?? "").toLowerCase());

    if (!allowedByCron && !allowedBySuperuser && !allowedBySupervisor) {
      return NextResponse.json({ error: "Unauthorized: CRON_SECRET or supervisor+ required" }, { status: 401 });
    }

    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date")?.trim();
    if (dateParam && !parseYmd(dateParam)) {
      return NextResponse.json({ error: "Invalid date format (use YYYY-MM-DD)" }, { status: 400 });
    }

    const result = await runAttendanceDailyArchive({
      dateYmd: dateParam || undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("Attendance archive failed:", e);
    const message = e instanceof Error ? e.message : "Archive failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
