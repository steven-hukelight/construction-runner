import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ABSENT_FOR_PREFIX, parseAbsentForDate } from "@/lib/attendanceAbsent";
import { resolvePreInductionAuth } from "@/app/api/pre-induction/_utils/mobileAuth";
import { compareAttendanceNewestFirst } from "@/lib/attendanceRowOrdering";
import { fetchLatestAttendanceRowForUser } from "@/lib/attendanceLatestRow";
import { resolveAttendanceStatusRow } from "@/lib/attendanceStatusRow";
import { dispatchPendingAttendancePushNotifications } from "@/lib/dispatchAttendancePushQueue";

export const dynamic = "force-dynamic";

export function utcCalendarDayBounds(d = new Date()) {
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth();
  const day = d.getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const utcDateStr = `${y}-${pad(mo + 1)}-${pad(day)}`;
  const dayStart = new Date(Date.UTC(y, mo, day, 0, 0, 0, 0)).toISOString();
  const dayEnd = new Date(Date.UTC(y, mo, day + 1, 0, 0, 0, 0)).toISOString();
  return { dayStart, dayEnd, utcDateStr };
}

function normalizeAction(raw: string | null | undefined): string {
  return (raw ?? "").toString().toUpperCase().replace(/\s+/g, "_");
}

type ApiLastAction = "SIGN_IN" | "SIGN_OUT" | "ABSENT" | "NONE";

type AttendanceRow = {
  id: string;
  action: string;
  site_id: string | null;
  company_id?: string | null;
  timestamp: string;
  created_at?: string | null;
  notes?: string | null;
  auto_sign_out?: boolean | null;
  auto_sign_out_reason?: string | null;
  exit_time?: string | null;
  exit_time_millis?: number | string | null;
  sign_out_time?: string | null;
};

function mapToApiLastAction(lastNorm: string): ApiLastAction {
  if (lastNorm === "ABSENT" || lastNorm === "MARK_ABSENT") return "ABSENT";
  if (lastNorm === "SIGN_IN" || lastNorm === "IN" || lastNorm === "SIGNIN" || lastNorm === "CHECKIN") {
    return "SIGN_IN";
  }
  if (lastNorm === "SIGN_OUT" || lastNorm === "OUT" || lastNorm === "SIGNOUT" || lastNorm === "CHECKOUT") {
    return "SIGN_OUT";
  }
  return "NONE";
}

/** GET /api/me/attendance-status — site attendance for the current UTC day, plus any open prior-day sign-in */
export async function GET(req: Request) {
  const empty = {
    signedIn: false,
    lastAction: "NONE" as ApiLastAction,
    lastEventAt: undefined as string | undefined,
    siteId: undefined as string | undefined,
    siteName: undefined as string | undefined,
    absentToday: false,
    signInOutLocked: false,
    activeAttendanceId: undefined as string | undefined,
    exitTime: undefined as string | undefined,
    exitTimeMillis: undefined as number | undefined,
    signOutTime: undefined as string | undefined,
    autoSignOutReason: undefined as string | undefined,
  };

  try {
    const mobileAuth = await resolvePreInductionAuth({ req });
    const cookieStore = await cookies();
    const email = cookieStore.get("user_email")?.value ?? mobileAuth.userEmail ?? undefined;

    let userId: string | null = mobileAuth.uid ? String(mobileAuth.uid) : null;
    if (!userId && email) {
      const { data: user } = await supabaseAdmin.from("users").select("id").eq("email", email).maybeSingle();
      if (user) userId = String((user as { id: string }).id);
    }
    if (!userId) {
      return NextResponse.json(empty, { status: 200 });
    }

    // Hobby Vercel cron only drains the attendance push queue once per day; mobile polls this
    // endpoint often, so opportunistically flush pending OneSignal rows (idempotent).
    const isMobileClient = req.headers.get("x-client")?.toLowerCase() === "mobile";
    if (isMobileClient) {
      void dispatchPendingAttendancePushNotifications(50).catch((err) =>
        console.warn("[push] drain on GET /api/me/attendance-status (mobile):", err)
      );
    }

    const { dayStart, dayEnd, utcDateStr } = utcCalendarDayBounds();

    const roleLower = (cookieStore.get("role")?.value ?? mobileAuth.role ?? "").toLowerCase();
    const cookieCompanyId =
      cookieStore.get("companyId")?.value?.trim() || cookieStore.get("company_id")?.value?.trim() || undefined;

    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();
    const dbCompanyId = (profile as { company_id?: string | null } | null)?.company_id;
    const dbCompanyStr = dbCompanyId != null && String(dbCompanyId).trim() ? String(dbCompanyId).trim() : undefined;

    let companyIdForScope: string | undefined;
    if (roleLower === "superuser" && cookieCompanyId) {
      companyIdForScope = cookieCompanyId;
    } else {
      companyIdForScope =
        (mobileAuth.companyId && String(mobileAuth.companyId).trim()) || dbCompanyStr || cookieCompanyId || undefined;
    }

    const selectCols =
      "id, action, site_id, company_id, timestamp, created_at, notes, auto_sign_out, auto_sign_out_reason, exit_time, exit_time_millis, sign_out_time";

    const companyOrFilter =
      companyIdForScope != null && companyIdForScope !== ""
        ? `company_id.eq.${companyIdForScope},company_id.is.null`
        : null;

    let byCreatedQuery = supabaseAdmin.from("attendance").select(selectCols).eq("user_id", userId);
    if (companyOrFilter) byCreatedQuery = byCreatedQuery.or(companyOrFilter);
    const byCreatedPromise = byCreatedQuery
      .gte("created_at", dayStart)
      .lt("created_at", dayEnd)
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("timestamp", { ascending: false })
      .limit(80);

    let byTimestampQuery = supabaseAdmin.from("attendance").select(selectCols).eq("user_id", userId);
    if (companyOrFilter) byTimestampQuery = byTimestampQuery.or(companyOrFilter);
    const byTimestampPromise = byTimestampQuery
      .gte("timestamp", dayStart)
      .lt("timestamp", dayEnd)
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("timestamp", { ascending: false })
      .limit(80);

    /**
     * Two day windows: (1) created_at in UTC day — authoritative insert order;
     * (2) timestamp in UTC day — legacy rows where client/server timestamp disagrees with created_at.
     * Merge, dedupe by id, sort newest first.
     */
    const [{ data: byCreated }, { data: byTimestamp }, { data: absentCandidates }, lastEver] = await Promise.all([
      byCreatedPromise,
      byTimestampPromise,
      supabaseAdmin
        .from("attendance")
        .select("action, notes")
        .eq("user_id", userId)
        .like("notes", `${ABSENT_FOR_PREFIX}%`)
        .order("created_at", { ascending: false, nullsFirst: false })
        .order("timestamp", { ascending: false })
        .limit(200),
      fetchLatestAttendanceRowForUser(selectCols, userId, companyIdForScope),
    ]);

    const merged = new Map<string, AttendanceRow>();
    for (const r of [...(byCreated ?? []), ...(byTimestamp ?? [])] as AttendanceRow[]) {
      merged.set(String(r.id), r);
    }
    const rawList = [...merged.values()];

    let absentToday = false;
    for (const r of absentCandidates ?? []) {
      const a = normalizeAction((r as { action: string }).action);
      if (a !== "ABSENT" && a !== "MARK_ABSENT") continue;
      const forDate = parseAbsentForDate((r as { notes?: string | null }).notes ?? null);
      if (forDate === utcDateStr) {
        absentToday = true;
        break;
      }
    }

    const todayRows = rawList.sort(compareAttendanceNewestFirst);
    const last = resolveAttendanceStatusRow(
      todayRows[0] ?? null,
      lastEver as AttendanceRow | null
    );

    if (!last) {
      return NextResponse.json({
        ...empty,
        absentToday,
        signInOutLocked: absentToday,
      });
    }
    const lastNorm = normalizeAction(last.action);
    const lastAction = mapToApiLastAction(lastNorm);

    const signedIn = lastAction === "SIGN_IN";
    const activeAttendanceId = signedIn && last.id ? String(last.id) : undefined;

    let siteName: string | undefined;
    if (last.site_id) {
      const { data: site } = await supabaseAdmin.from("sites").select("name").eq("id", last.site_id).maybeSingle();
      siteName = (site as { name?: string } | null)?.name ?? undefined;
    }

    let exitTime: string | undefined;
    let exitTimeMillis: number | undefined;
    let signOutTime: string | undefined;
    let autoSignOutReason: string | undefined;
    if (!signedIn && lastAction === "SIGN_OUT") {
      signOutTime = last.sign_out_time != null ? String(last.sign_out_time) : last.timestamp;
      if (last.exit_time) exitTime = String(last.exit_time);
      const em = last.exit_time_millis;
      if (em != null && !Number.isNaN(Number(em))) exitTimeMillis = Number(em);
      if (last.auto_sign_out_reason) autoSignOutReason = String(last.auto_sign_out_reason);
    }

    const canonicalWhen =
      last.created_at != null && String(last.created_at).trim()
        ? String(last.created_at)
        : last.timestamp;

    const lastEventAt =
      lastAction === "SIGN_OUT" && last.sign_out_time != null && String(last.sign_out_time).trim()
        ? String(last.sign_out_time)
        : canonicalWhen;

    return NextResponse.json({
      signedIn,
      lastAction,
      lastEventAt,
      siteId: last.site_id ? String(last.site_id) : undefined,
      siteName,
      absentToday,
      signInOutLocked: absentToday,
      activeAttendanceId,
      exitTime,
      exitTimeMillis,
      signOutTime,
      autoSignOutReason,
    });
  } catch (e) {
    console.error("GET /api/me/attendance-status failed:", e);
    return NextResponse.json(empty, { status: 200 });
  }
}
