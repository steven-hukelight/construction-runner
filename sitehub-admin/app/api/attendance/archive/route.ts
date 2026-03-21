/**
 * Attendance archive: GET reads from attendance_archive; POST archives and clears live list.
 * Call POST via cron at 00:00 or manually by supervisors.
 * Set CRON_SECRET in env; Vercel cron sends Authorization: Bearer <CRON_SECRET>.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
async function normalizeArchiveRows(rows: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
  if (!rows.length) return [];
  const userIds = [...new Set(rows.map((r) => r.user_id as string).filter(Boolean))];
  const siteIds = [...new Set(rows.map((r) => r.site_id as string).filter(Boolean))];
  const [usersRes, sitesRes] = await Promise.all([
    userIds.length ? supabaseAdmin.from("users").select("id, name, display_name, email").in("id", userIds) : { data: [] },
    siteIds.length ? supabaseAdmin.from("sites").select("id, name").in("id", siteIds) : { data: [] },
  ]);
  const userMap = new Map<string, { name?: string; display_name?: string; email?: string }>();
  (usersRes.data ?? []).forEach((u: Record<string, unknown>) => {
    userMap.set(String(u.id), u as { name?: string; display_name?: string; email?: string });
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
    return {
      ...r,
      userId: r.user_id,
      operativeId: r.user_id,
      siteId: r.site_id,
      companyId: r.company_id,
      name: name ?? r.name,
      action: (r.action != null && String(r.action).trim()) ? String(r.action).trim() : "SIGN IN",
      siteName: site?.name ?? r.siteName ?? r.site_name,
    };
  });
}

export async function GET(req: Request) {
  try {
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
    const [y, m, d] = dateParam.split("-").map(Number);
    if (!y || !m || !d) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
    const dayEnd = new Date(y, m - 1, d + 1, 0, 0, 0, 0).toISOString();
    if (role === "superuser") {
      companyId = url.searchParams.get("companyId") ?? companyId ?? undefined;
    }
    let q = supabaseAdmin
      .from("attendance_archive")
      .select("*")
      .eq("archive_date", dateParam)
      .gte("timestamp", dayStart)
      .lt("timestamp", dayEnd)
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
    return NextResponse.json([], { status: 200 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const role = (await cookies()).get("role")?.value;

    const allowedByCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const allowedBySuperuser = role === "superuser";
    const allowedBySupervisor = ["supervisor", "admin"].includes((role ?? "").toLowerCase());

    if (!allowedByCron && !allowedBySuperuser && !allowedBySupervisor) {
      return NextResponse.json({ error: "Unauthorized: CRON_SECRET or supervisor+ required" }, { status: 401 });
    }

    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date")?.trim(); // YYYY-MM-DD; default yesterday for cron, today for manual
    const isManual = allowedBySupervisor && !allowedByCron;

    let archiveDate: Date;
    if (dateParam) {
      const [y, m, d] = dateParam.split("-").map(Number);
      if (!y || !m || !d) {
        return NextResponse.json({ error: "Invalid date format (use YYYY-MM-DD)" }, { status: 400 });
      }
      archiveDate = new Date(y, m - 1, d);
    } else {
      archiveDate = isManual ? new Date() : new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    const dayStart = new Date(archiveDate.getFullYear(), archiveDate.getMonth(), archiveDate.getDate(), 0, 0, 0, 0).toISOString();
    const dayEnd = new Date(archiveDate.getFullYear(), archiveDate.getMonth(), archiveDate.getDate() + 1, 0, 0, 0, 0).toISOString();

    const { data: rows } = await supabaseAdmin
      .from("attendance")
      .select("*")
      .gte("timestamp", dayStart)
      .lt("timestamp", dayEnd);

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        archived: 0,
        deleted: 0,
        message: "No entries to archive",
        ranAt: new Date().toISOString(),
      });
    }

    const archiveDateStr = archiveDate.toISOString().slice(0, 10);

    const inserts = rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      site_id: r.site_id,
      company_id: r.company_id ?? "",
      action: r.action ?? "SIGN IN",
      timestamp: r.timestamp,
      latitude: r.latitude,
      longitude: r.longitude,
      accuracy: r.accuracy,
      email: r.email,
      archive_date: archiveDateStr,
      created_at: r.created_at ?? new Date().toISOString(),
    }));

    const { error: insertError } = await supabaseAdmin.from("attendance_archive").upsert(inserts, {
      onConflict: "id",
      ignoreDuplicates: false,
    });

    if (insertError) {
      console.error("Attendance archive insert error:", insertError);
      return NextResponse.json({ error: "Failed to archive: " + insertError.message }, { status: 500 });
    }

    const ids = rows.map((r) => r.id);
    const { error: deleteError } = await supabaseAdmin.from("attendance").delete().in("id", ids);

    if (deleteError) {
      console.error("Attendance delete error:", deleteError);
      return NextResponse.json({ error: "Archived but failed to clear live list: " + deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      archived: rows.length,
      deleted: rows.length,
      archiveDate: archiveDateStr,
      ranAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Attendance archive failed:", e);
    return NextResponse.json({ error: "Archive failed" }, { status: 500 });
  }
}
