import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { getRamsStatusForSite, isRamsCompliant, type RamsTrainingData } from "@/lib/ramsCompliance";
import {
  ABSENT_FOR_PREFIX,
  formatAbsentNotes,
  parseAbsentForDate,
  parseYmd,
  utcTodayYmd,
  ymdBefore,
} from "@/lib/attendanceAbsent";
import { resolvePreInductionAuth } from "@/app/api/pre-induction/_utils/mobileAuth";
import {
  logAutoSignOutApiContext,
  logAutoSignOutTriggeredApi,
} from "@/lib/autoSignOutDiagnostics";
import { AUTO_SIGN_OUT_TIMEOUT_MS } from "@/lib/attendanceFallbackConstants";
import { fetchLatestAttendanceRowForUser } from "@/lib/attendanceLatestRow";
import { enrichAttendanceApiFields, exitIsoFromBody, normalizeAttendanceAction } from "@/lib/attendanceRowEnrich";
import { sendAttendanceAutoSignOutPush } from "@/lib/attendanceAutoSignOutPush";

export const dynamic = "force-dynamic";

/**
 * Hybrid auto sign-out:
 * - Foreground: worker app Dart timer (unchanged).
 * - Native strict: POST with auto_sign_out + auto_sign_out_reason "native_geofence" (optional).
 * - Server fallback: Supabase pg_cron `perform_attendance_fallback()` every minute; stale ping (>25s) plus
 *   outside fence: uses `last_location_outside_fence` when set by foreground pings, else legacy coordinate check.
 *   Push queue drained by
 *   `POST /api/maintenance/dispatch-attendance-push-queue` with CRON_SECRET (Vercel cron or equivalent).
 */

async function userHasAbsentForUtcDate(userId: string, absentForYmd: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("attendance")
    .select("action, notes")
    .eq("user_id", userId)
    .like("notes", `${ABSENT_FOR_PREFIX}%`)
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("timestamp", { ascending: false })
    .limit(200);
  for (const r of data ?? []) {
    const a = normalizeAttendanceAction((r as { action: string }).action);
    if (a !== "ABSENT" && a !== "MARK_ABSENT") continue;
    if (parseAbsentForDate((r as { notes?: string | null }).notes ?? null) === absentForYmd) return true;
  }
  return false;
}

/** Normalize attendance rows: add camelCase aliases, enrich with user/site names, and company (from row or user) */
async function normalizeAttendanceRows(rows: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
  if (!rows.length) return [];
  const userIds = [...new Set(rows.map((r) => r.user_id as string).filter(Boolean))];
  const siteIds = [...new Set(rows.map((r) => r.site_id as string).filter(Boolean))];

  const [usersRes, sitesRes] = await Promise.all([
    userIds.length > 0 ? supabaseAdmin.from("users").select("id, name, display_name, email, company_id").in("id", userIds) : { data: [] },
    siteIds.length > 0 ? supabaseAdmin.from("sites").select("id, name").in("id", siteIds) : { data: [] },
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
      const siteName = site?.name;
      const rowCompanyId = (r.company_id ?? r.companyid) as string | undefined;
      const companyId = rowCompanyId && String(rowCompanyId).trim() ? rowCompanyId : (user?.company_id ? String(user.company_id) : undefined);
      const base = enrichAttendanceApiFields({
        ...r,
        userId: r.user_id,
        operativeId: r.user_id,
        uid: r.user_id,
        siteId: r.site_id,
        companyId: companyId ?? rowCompanyId,
        company_id: companyId ?? rowCompanyId ?? r.company_id,
        name: name ?? r.name,
        displayName: name ?? r.displayName,
        operativeName: name ?? r.operativeName,
        siteName: siteName ?? r.siteName ?? r.site_name,
      });
      return base;
    });
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const mobileAuth = await resolvePreInductionAuth({ req });
    let role = cookieStore.get("role")?.value ?? mobileAuth.role ?? undefined;
    const companyRaw = cookieStore.get("companyId")?.value ?? mobileAuth.companyId;
    let companyId =
      typeof companyRaw === "string" ? companyRaw.trim() : companyRaw ?? undefined;
    if (companyId === "") companyId = undefined;
    const hasBearer = req.headers.get("authorization")?.toLowerCase().startsWith("bearer ") ?? false;
    // Mobile worker app uses Bearer only; if users.role is null in DB, still scope GET to self.
    if (!role && hasBearer && mobileAuth.uid) {
      role = "operative";
    }

    const roleLowerEarly = (role ?? "").toLowerCase();
    if ((!role || !companyId) && roleLowerEarly !== "superuser") {
      const email = cookieStore.get("user_email")?.value ?? mobileAuth.userEmail ?? undefined;
      if (email) {
        const { data: users, error: usersLookupErr } = await supabaseAdmin
          .from("users")
          .select("id, role, company_id")
          .eq("email", email)
          .limit(1);
        if (usersLookupErr) {
          console.error("[GET /api/attendance] users lookup by email:", usersLookupErr.message, usersLookupErr);
        }
        if (users?.length) {
          const u = users[0];
          if (!role) role = u.role ?? undefined;
          if (!companyId && u.company_id) companyId = String(u.company_id).trim() || undefined;
        }
      }
    }

    const isSuperuserRole = (role ?? "").toLowerCase() === "superuser";

    const limit = limitParam ? Math.max(1, Math.min(500, parseInt(limitParam))) : 200;
    const siteIdParam = url.searchParams.get("siteId")?.trim() || url.searchParams.get("site_id")?.trim() || undefined;
    const userIdParam = url.searchParams.get("userId")?.trim() || url.searchParams.get("user_id")?.trim() || undefined;
    const dateParam = url.searchParams.get("date")?.trim() || undefined; // legacy: server TZ (avoid for web UI)
    const windowStart = url.searchParams.get("windowStart")?.trim();
    const windowEnd = url.searchParams.get("windowEnd")?.trim();

    let dayStart: string | undefined;
    let dayEnd: string | undefined;
    if (windowStart && windowEnd) {
      const a = Date.parse(windowStart);
      const b = Date.parse(windowEnd);
      if (!Number.isNaN(a) && !Number.isNaN(b) && a <= b) {
        dayStart = windowStart;
        dayEnd = windowEnd;
      }
    }
    if (!dayStart && dateParam) {
      const [y, m, d] = dateParam.split("-").map(Number);
      if (y && m && d) {
        dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
        dayEnd = new Date(y, m - 1, d + 1, 0, 0, 0, 0).toISOString();
      }
    }

    const applyExtraFilters = (q: ReturnType<ReturnType<typeof supabaseAdmin.from>["select"]>) => {
      if (siteIdParam) q = q.eq("site_id", siteIdParam);
      if (userIdParam) q = q.eq("user_id", userIdParam);
      if (dayStart && dayEnd) {
        // Inclusive end when client sends windowStart/windowEnd from local day (23:59:59.999)
        const useLte = Boolean(url.searchParams.get("windowStart") && url.searchParams.get("windowEnd"));
        q = q.gte("timestamp", dayStart);
        q = useLte ? q.lte("timestamp", dayEnd) : q.lt("timestamp", dayEnd);
      }
      return q;
    };

    if (isSuperuserRole) {
      const qCo = (url.searchParams.get("companyId") ?? "").trim();
      companyId = qCo || companyId;
      if (companyId) {
        const { data: users, error: companyUsersErr } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("company_id", companyId);
        if (companyUsersErr) {
          console.error("[GET /api/attendance] superuser company users:", companyUsersErr.message, companyUsersErr);
        }
        const userIds = (users ?? []).map((u) => u.id);
        if (userIds.length === 0) return NextResponse.json([]);
        let q = supabaseAdmin.from("attendance").select("*").in("user_id", userIds);
        q = applyExtraFilters(q);
        const { data: att, error: attErr } = await q.order("timestamp", { ascending: false }).limit(limit);
        if (attErr) console.error("[GET /api/attendance] attendance query:", attErr.message, attErr);
        const normalized = await normalizeAttendanceRows(att ?? []);
        return NextResponse.json(normalized);
      }
      let q = supabaseAdmin.from("attendance").select("*");
      q = applyExtraFilters(q);
      const { data: att, error: attAllErr } = await q.order("timestamp", { ascending: false }).limit(limit);
      if (attAllErr) console.error("[GET /api/attendance] attendance (all) query:", attAllErr.message, attAllErr);
      const normalized = await normalizeAttendanceRows(att ?? []);
      return NextResponse.json(normalized);
    }

    const roleLower = (role ?? "").toLowerCase();
    if (roleLower === "operative") {
      let operativeUserId: string | null = null;
      const emailForMe = cookieStore.get("user_email")?.value ?? mobileAuth.userEmail ?? "";
      if (emailForMe) {
        const { data: me, error: meErr } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", emailForMe)
          .maybeSingle();
        if (meErr) console.error("[GET /api/attendance] operative user lookup:", meErr.message, meErr);
        if (me?.id) operativeUserId = String(me.id);
      }
      if (!operativeUserId && mobileAuth.uid) {
        operativeUserId = String(mobileAuth.uid);
      }
      if (operativeUserId) {
        let q = supabaseAdmin.from("attendance").select("*").eq("user_id", operativeUserId);
        if (siteIdParam) q = q.eq("site_id", siteIdParam);
        if (dayStart && dayEnd) q = q.gte("timestamp", dayStart).lt("timestamp", dayEnd);
        const { data: att, error: attOpErr } = await q.order("timestamp", { ascending: false }).limit(limit);
        if (attOpErr) console.error("[GET /api/attendance] operative attendance:", attOpErr.message, attOpErr);
        const normalized = await normalizeAttendanceRows(att ?? []);
        return NextResponse.json(normalized);
      }
      return NextResponse.json([]);
    }

    if (companyId) {
      const { data: users, error: adminUsersErr } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("company_id", companyId);
      if (adminUsersErr) {
        console.error("[GET /api/attendance] admin company users:", adminUsersErr.message, adminUsersErr);
      }
      const userIds = (users ?? []).map((u) => u.id);
      if (userIds.length === 0) return NextResponse.json([], { status: 200 });
      let q = supabaseAdmin.from("attendance").select("*").in("user_id", userIds);
      q = applyExtraFilters(q);
      const { data: att, error: attAdminErr } = await q.order("timestamp", { ascending: false }).limit(limit);
      if (attAdminErr) console.error("[GET /api/attendance] admin attendance:", attAdminErr.message, attAdminErr);
      const normalized = await normalizeAttendanceRows(att ?? []);
      return NextResponse.json(normalized);
    }
    return NextResponse.json([], { status: 200 });
  } catch (e: unknown) {
    const err = e as Error;
    console.error("GET /api/attendance failed:", err?.message || e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const operativeId = body.operativeId ?? body.operative_id;
    const sessionPing = body.attendance_session_ping === true || body.attendanceSessionPing === true;

    if (sessionPing) {
      if (!operativeId) {
        return NextResponse.json({ error: "operativeId required" }, { status: 400 });
      }
      const mobileAuthPing = await resolvePreInductionAuth({
        req,
        uidFromBody: typeof operativeId === "string" ? operativeId : String(operativeId),
      });
      const authHeaderPing = req.headers.get("authorization");
      const hasBearerPing = authHeaderPing?.toLowerCase().startsWith("bearer ");
      if (hasBearerPing && mobileAuthPing.uid && String(operativeId) !== String(mobileAuthPing.uid)) {
        return NextResponse.json({ error: "Operatives can only update their own session" }, { status: 403 });
      }
      const cookieStorePing = await cookies();
      const rolePing = cookieStorePing.get("role")?.value ?? mobileAuthPing.role ?? undefined;
      const roleLowerPing = (rolePing ?? "").toLowerCase();
      if (!hasBearerPing) {
        if (roleLowerPing !== "operative") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const emailPing = cookieStorePing.get("user_email")?.value ?? mobileAuthPing.userEmail ?? "";
        const { data: mePing } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", emailPing)
          .maybeSingle();
        if (!mePing?.id || String(mePing.id) !== String(operativeId)) {
          return NextResponse.json({ error: "Operatives can only update their own session" }, { status: 403 });
        }
      }
      const latPing = body.latitude ?? body.lat;
      const lngPing = body.longitude ?? body.lng ?? body.lon;
      if (latPing == null || lngPing == null) {
        return NextResponse.json({ error: "latitude and longitude required" }, { status: 400 });
      }
      const { data: profPing } = await supabaseAdmin
        .from("users")
        .select("company_id")
        .eq("id", operativeId)
        .maybeSingle();
      const dbCoPing =
        (profPing as { company_id?: string | null } | null)?.company_id != null
          ? String((profPing as { company_id?: string | null }).company_id).trim()
          : undefined;
      const cookieCoPing =
        cookieStorePing.get("companyId")?.value?.trim() ||
        cookieStorePing.get("company_id")?.value?.trim() ||
        undefined;
      const companyScopePing =
        roleLowerPing === "superuser" && cookieCoPing
          ? cookieCoPing
          : (mobileAuthPing.companyId?.trim() || dbCoPing || cookieCoPing || undefined);
      const lastPing = await fetchLatestAttendanceRowForUser(
        "id, action",
        String(operativeId),
        companyScopePing
      );
      const lastNormPing = normalizeAttendanceAction((lastPing as { action?: string } | null)?.action);
      const lastIsSignInPing =
        lastNormPing === "SIGN_IN" || lastNormPing === "IN" || lastNormPing === "SIGNIN" || lastNormPing === "CHECKIN";
      if (!lastPing?.id || !lastIsSignInPing) {
        return NextResponse.json({ error: "not_signed_in", message: "No open sign-in session to update." }, { status: 409 });
      }
      const accPing = body.accuracy;
      const patchPing: Record<string, unknown> = {
        last_location_lat: Number(latPing),
        last_location_lng: Number(lngPing),
        last_location_timestamp: new Date().toISOString(),
      };
      if (accPing != null) patchPing.last_location_accuracy = Number(accPing);
      const { error: pingErr } = await supabaseAdmin.from("attendance").update(patchPing).eq("id", lastPing.id);
      if (pingErr) {
        console.error("attendance session ping update:", pingErr);
        return NextResponse.json({ error: pingErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    const name = body.name;
    const siteId = body.site_id ?? body.siteId;
    const siteName = body.site_name ?? body.siteName;
    const action = body.action;
    const notes = body.notes;
    const email = body.email;
    if (!operativeId || !action) return NextResponse.json({ error: "operativeId and action required" }, { status: 400 });

    const mobileAuth = await resolvePreInductionAuth({
      req,
      uidFromBody: typeof operativeId === "string" ? operativeId : String(operativeId),
    });
    const authHeader = req.headers.get("authorization");
    const hasBearer = authHeader?.toLowerCase().startsWith("bearer ");
    if (hasBearer && mobileAuth.uid && String(operativeId) !== String(mobileAuth.uid)) {
      return NextResponse.json({ error: "Operatives can only sign in themselves" }, { status: 403 });
    }

    let resolvedName: string | null = name ?? null;
    try {
      if (!resolvedName) {
        const { data: user } = await supabaseAdmin.from("users").select("display_name, email").eq("id", operativeId).maybeSingle();
        if (user) {
          resolvedName = user.display_name ?? null;
          if (!resolvedName && user.email) resolvedName = String(user.email).split("@")[0];
        } else if (email) {
          const { data: byEmail } = await supabaseAdmin.from("users").select("display_name, email").eq("email", String(email)).limit(1);
          if (byEmail?.[0]) {
            resolvedName = byEmail[0].display_name ?? null;
            if (!resolvedName && byEmail[0].email) resolvedName = String(byEmail[0].email).split("@")[0];
          }
        }
      }
    } catch {
      // non-fatal
    }

    let resolvedSiteName: string | null = siteName ?? null;
    try {
      if (!resolvedSiteName && siteId) {
        const { data: site } = await supabaseAdmin.from("sites").select("name").eq("id", String(siteId)).maybeSingle();
        if (site) resolvedSiteName = site.name ?? null;
      }
    } catch {
      // ignore
    }

    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value ?? mobileAuth.role ?? undefined;
    const url = new URL(req.url);
    let companyId = cookieStore.get("companyId")?.value?.trim() ?? mobileAuth.companyId?.trim() ?? undefined;
    const userEmailEffective = cookieStore.get("user_email")?.value ?? mobileAuth.userEmail ?? undefined;
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value ?? mobileAuth.companyId ?? undefined,
          userEmail: userEmailEffective,
          role,
        })) || undefined;
    }
    // Superuser: company can come from body (mobile extraData) or query param (ApiClient adds ?companyId=)
    const bodyCompanyId = body.company_id ?? body.companyId ?? body.companyid;
    const queryCompanyId = url.searchParams.get("companyId")?.trim() || undefined;
    // Native geofence / mobile Bearer often has no cookies; body company_id must count for operatives too.
    const assignedCompanyId =
      role === "superuser"
        ? (bodyCompanyId ?? queryCompanyId ?? companyId ?? null)
        : (companyId ?? bodyCompanyId ?? queryCompanyId ?? null);
    if (!assignedCompanyId) return NextResponse.json({ error: "company_id required" }, { status: 400 });

    // Verify operative exists in users table (required for FK)
    const { data: operativeUser } = await supabaseAdmin.from("users").select("id").eq("id", operativeId).maybeSingle();
    if (!operativeUser) {
      return NextResponse.json(
        { error: "User not found. The operative ID may not exist in the database." },
        { status: 404 }
      );
    }

    const roleLower = (role ?? "").toLowerCase();
    if (roleLower === "operative" && !hasBearer) {
      const { data: me } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", cookieStore.get("user_email")?.value ?? "")
        .maybeSingle();
      if (me && operativeId !== me.id) {
        return NextResponse.json({ error: "Operatives can only sign in themselves" }, { status: 403 });
      }
    }

    const actionNormalized = (action ?? "").toString().toUpperCase().replace(/\s/g, "_");
    const isAbsent = actionNormalized === "ABSENT" || actionNormalized === "MARK_ABSENT";
    const isSignIn = actionNormalized === "IN" || actionNormalized === "SIGN_IN" || actionNormalized === "CHECKIN";
    const isSignOut =
      actionNormalized === "SIGN_OUT" ||
      actionNormalized === "OUT" ||
      actionNormalized === "SIGNOUT" ||
      actionNormalized === "CHECKOUT";

    // --- Mark absent (UTC calendar day) ---
    if (isAbsent) {
      const rawDate = (body.absentDate ?? body.date ?? body.absent_date) as string | undefined;
      const absentDateYmd = (rawDate && String(rawDate).trim()) || utcTodayYmd();
      if (!parseYmd(absentDateYmd)) {
        return NextResponse.json({ error: "invalid_absent_date", message: "Use YYYY-MM-DD (UTC calendar date)." }, { status: 400 });
      }
      const todayY = utcTodayYmd();
      if (ymdBefore(absentDateYmd, todayY)) {
        return NextResponse.json(
          { error: "absent_date_past", message: "Cannot mark absent for a past UTC date." },
          { status: 400 }
        );
      }

      const { data: existingAbsent } = await supabaseAdmin
        .from("attendance")
        .select("id")
        .eq("user_id", operativeId)
        .eq("action", "ABSENT")
        .like("notes", `${ABSENT_FOR_PREFIX}${absentDateYmd}%`)
        .limit(1)
        .maybeSingle();
      if (existingAbsent?.id) {
        return NextResponse.json(
          { error: "already_absent_for_date", message: "Absent already recorded for this date.", id: existingAbsent.id },
          { status: 409 }
        );
      }

      const notesCombined = formatAbsentNotes(absentDateYmd, notes ? String(notes) : null);
      const insertAbsent: Record<string, unknown> = {
        id: randomUUID(),
        user_id: operativeId,
        site_id: null,
        timestamp: new Date().toISOString(),
        action: "ABSENT",
        notes: notesCombined,
      };
      if (assignedCompanyId) insertAbsent.company_id = String(assignedCompanyId);

      const { data: insAbsent, error: errAbsent } = await supabaseAdmin
        .from("attendance")
        .insert(insertAbsent)
        .select("id")
        .single();
      if (errAbsent) {
        console.error("POST /api/attendance absent insert:", errAbsent);
        throw errAbsent;
      }
      return NextResponse.json({ id: insAbsent?.id }, { status: 201 });
    }

    const todayUtc = utcTodayYmd();
    if (await userHasAbsentForUtcDate(operativeId, todayUtc)) {
      return NextResponse.json(
        {
          error: "absent_today",
          message: "Sign-in and sign-out are disabled for today (UTC) after marking absent.",
        },
        { status: 403 }
      );
    }

    const siteForAttendance =
      siteId !== null && siteId !== undefined && String(siteId).trim() !== "" ? String(siteId).trim() : "";

    if (isSignIn && !siteForAttendance) {
      return NextResponse.json(
        {
          error: "site_required",
          message: "No site selected. Choose a site from the list, then sign in.",
        },
        { status: 400 }
      );
    }

    if (isSignIn && siteId) {
      const { data: site } = await supabaseAdmin.from("sites").select("rams_version, ramsversion").eq("id", String(siteId)).maybeSingle();
      const siteRamsVersion = (site?.rams_version ?? site?.ramsversion ?? null) as string | null;
      const siteHasRams = !!siteRamsVersion;

      if (siteHasRams) {
        const { data: user } = await supabaseAdmin.from("users").select("admin_pre_induction_override").eq("id", operativeId).maybeSingle();
        const adminOverride = (user as { admin_pre_induction_override?: boolean })?.admin_pre_induction_override === true;
        const { data: ind } = await supabaseAdmin.from("user_site_inductions").select("*").eq("user_id", operativeId).eq("site_id", siteId).maybeSingle();
        const grandfathered = ind?.grandfathered === true;
        const { data: trainingRow } = await supabaseAdmin.from("pre_induction_training").select("*").eq("user_id", operativeId).maybeSingle();
        const training = trainingRow ? { ramsVersion: trainingRow.rams_version, ramsAccepted: trainingRow.rams_accepted, ramsAcceptedAt: trainingRow.rams_accepted_at } as RamsTrainingData : null;
        const ramsCompliant = isRamsCompliant(
          { training, siteRamsVersion, siteHasRams },
          { adminPreInductionOverride: adminOverride, grandfathered }
        );
        if (!ramsCompliant) {
          const ramsStatus = getRamsStatusForSite(training, String(siteId), siteRamsVersion);
          return NextResponse.json(
            { error: "rams_required", ramsStatus, message: "RAMS acceptance is required before signing in to this site. Please accept the current RAMS version." },
            { status: 403 }
          );
        }
      }
    }

    if (!isSignIn && !isSignOut) {
      return NextResponse.json(
        { error: "invalid_action", message: "Unsupported attendance action." },
        { status: 400 }
      );
    }

    const lastRow = await fetchLatestAttendanceRowForUser(
      // Omit last_location_outside_fence until migration 20260405120000_attendance_last_location_outside_fence.sql is applied (PostgREST errors if column missing).
      "id, action, user_id, auto_sign_out, auto_sign_out_reason, exit_time_millis, timestamp, created_at, site_id, last_location_lat, last_location_lng, last_location_timestamp, latitude, longitude",
      String(operativeId),
      assignedCompanyId
    );

    const lastNorm = normalizeAttendanceAction((lastRow as { action?: string } | null)?.action);
    const lastIsSignIn =
      lastNorm === "SIGN_IN" || lastNorm === "IN" || lastNorm === "SIGNIN" || lastNorm === "CHECKIN";

    if (isSignIn) {
      if (lastIsSignIn) {
        return NextResponse.json(
          { error: "already_signed_in", message: "Already signed in. Sign out before signing in again." },
          { status: 409 }
        );
      }
    } else {
      if (!lastIsSignIn) {
        const autoSignOutTry = body.auto_sign_out === true || body.autoSignOut === true;
        const reasonTry = body.auto_sign_out_reason ?? body.autoSignOutReason;
        const reasonStr = reasonTry != null ? String(reasonTry).trim() : "";
        const lastFull = lastRow as Record<string, unknown> | null;
        const lastReason = String(lastFull?.auto_sign_out_reason ?? "").toLowerCase();
        const isNativeReason = reasonStr === "native_geofence" || reasonStr.includes("native_geofence");
        if (
          isSignOut &&
          autoSignOutTry &&
          isNativeReason &&
          lastReason === "fallback" &&
          lastFull?.id &&
          String(lastFull.user_id) === String(operativeId)
        ) {
          logAutoSignOutApiContext(
            "POST /api/attendance [native_geofence_override]",
            String(operativeId),
            lastFull as Record<string, unknown>,
            { branch: "upgrade_fallback_row_to_native_geofence" }
          );
          logAutoSignOutTriggeredApi("POST /api/attendance [native_geofence_override]", String(operativeId), {
            attendanceId: lastFull.id,
          });
          const exitTimeRawU = body.exit_time ?? body.exitTime;
          const exitMillisRawU = body.exit_time_millis ?? body.exitTimeMillis;
          const exitIsoU = exitIsoFromBody(exitTimeRawU, exitMillisRawU);
          const emU =
            exitMillisRawU != null && !Number.isNaN(Number(exitMillisRawU))
              ? Number(exitMillisRawU)
              : exitIsoU
                ? new Date(exitIsoU).getTime()
                : null;
          const latU = body.latitude ?? body.lat;
          const lngU = body.longitude ?? body.lng ?? body.lon;
          const accU = body.accuracy;
          const meta = {
            auto_sign_out: true,
            exit_time: exitIsoU ?? (emU != null ? new Date(emU).toISOString() : null),
            exit_time_millis: emU,
            auto_sign_out_reason: "native_geofence",
          };
          const metaLine = JSON.stringify(meta);
          const existingNotes = notes != null && String(notes).trim() ? String(notes) : null;
          const notesStrU = existingNotes ? `${existingNotes}\n${metaLine}` : metaLine;
          const patch: Record<string, unknown> = {
            notes: notesStrU,
            auto_sign_out: true,
            auto_sign_out_reason: "native_geofence",
            exit_time_millis: emU ?? lastFull.exit_time_millis,
          };
          if (exitIsoU) patch.exit_time = exitIsoU;
          else if (emU != null) patch.exit_time = new Date(emU).toISOString();
          if (latU != null && lngU != null) {
            patch.exit_lat = Number(latU);
            patch.exit_lng = Number(lngU);
            patch.latitude = Number(latU);
            patch.longitude = Number(lngU);
            patch.last_location_lat = Number(latU);
            patch.last_location_lng = Number(lngU);
          }
          if (accU != null) {
            patch.exit_accuracy = Number(accU);
            patch.accuracy = Number(accU);
            patch.last_location_accuracy = Number(accU);
          }
          const { error: upErr } = await supabaseAdmin.from("attendance").update(patch).eq("id", lastFull.id);
          if (upErr) {
            console.error("strict sign-out override update:", upErr);
            return NextResponse.json({ error: upErr.message }, { status: 500 });
          }
          void sendAttendanceAutoSignOutPush(
            String(operativeId),
            "native_geofence",
            String(lastFull.id),
          ).catch((err) =>
            console.error("[push] attendance auto sign-out (native override):", err)
          );
          return NextResponse.json({ id: lastFull.id, updated: true }, { status: 200 });
        }
        return NextResponse.json(
          { error: "already_signed_out", message: "Cannot sign out when not signed in." },
          { status: 409 }
        );
      }
    }

    const storedAction = isSignIn ? "SIGN IN" : "SIGN OUT";
    const autoSignOut = body.auto_sign_out === true || body.autoSignOut === true;
    if (isSignOut && autoSignOut) {
      logAutoSignOutApiContext(
        "POST /api/attendance [client_auto_sign_out_insert]",
        String(operativeId),
        lastRow as Record<string, unknown> | null,
        {
          note: "Server pg fallback is separate (perform_attendance_fallback); this log is mobile/native client sign-out row insert.",
        }
      );
      console.log("[AUTO-SIGN-OUT] POST /api/attendance Condition: outsideFence =", "(not evaluated here — client reported geofence exit)");
      console.log(
        "[AUTO-SIGN-OUT] POST /api/attendance Condition: elapsed > timeout =",
        "(not evaluated here — see Supabase [AUTO-SIGN-OUT][FALLBACK] logs)"
      );
      console.log("[AUTO-SIGN-OUT] POST /api/attendance timeoutThresholdMs (fallback reference):", AUTO_SIGN_OUT_TIMEOUT_MS);
    }
    const exitTimeRaw = body.exit_time ?? body.exitTime;
    const exitMillisRaw = body.exit_time_millis ?? body.exitTimeMillis;
    const reasonRaw = body.auto_sign_out_reason ?? body.autoSignOutReason;
    let notesStr: string | null = notes != null && String(notes).trim() ? String(notes) : null;
    if (autoSignOut) {
      const meta = {
        auto_sign_out: true,
        exit_time: exitTimeRaw != null ? String(exitTimeRaw) : null,
        exit_time_millis: exitMillisRaw != null ? Number(exitMillisRaw) : null,
        auto_sign_out_reason: reasonRaw != null ? String(reasonRaw) : "native_geofence",
      };
      const metaLine = JSON.stringify(meta);
      notesStr = notesStr ? `${notesStr}\n${metaLine}` : metaLine;
    }

    const lat = body.latitude ?? body.lat;
    const lng = body.longitude ?? body.lng ?? body.lon;
    const acc = body.accuracy;

    const nowIso = new Date().toISOString();
    const insertPayload: Record<string, unknown> = {
      id: randomUUID(),
      user_id: operativeId,
      site_id: siteId && String(siteId).trim() ? String(siteId).trim() : null,
      timestamp: nowIso,
      action: storedAction,
      notes: notesStr,
      last_location_timestamp: nowIso,
    };
    if (lat != null && lng != null) {
      const la = Number(lat);
      const lo = Number(lng);
      insertPayload.latitude = la;
      insertPayload.longitude = lo;
      insertPayload.last_location_lat = la;
      insertPayload.last_location_lng = lo;
    }
    if (acc != null) {
      const ac = Number(acc);
      insertPayload.accuracy = ac;
      insertPayload.last_location_accuracy = ac;
    }
    if (assignedCompanyId) insertPayload.company_id = String(assignedCompanyId);

    if (isSignOut) {
      insertPayload.sign_out_time = nowIso;
      insertPayload.auto_sign_out = autoSignOut === true;
      if (autoSignOut) {
        insertPayload.auto_sign_out_reason =
          reasonRaw != null && String(reasonRaw).trim()
            ? String(reasonRaw).trim()
            : "native_geofence";
        const em =
          exitMillisRaw != null && !Number.isNaN(Number(exitMillisRaw)) ? Number(exitMillisRaw) : Date.now();
        insertPayload.exit_time_millis = em;
        const exIso = exitIsoFromBody(exitTimeRaw, exitMillisRaw);
        insertPayload.exit_time = exIso ?? new Date(em).toISOString();
        if (lat != null && lng != null) {
          insertPayload.exit_lat = Number(lat);
          insertPayload.exit_lng = Number(lng);
          if (acc != null) insertPayload.exit_accuracy = Number(acc);
        }
      } else {
        insertPayload.auto_sign_out_reason = null;
        insertPayload.exit_time_millis = null;
        insertPayload.exit_time = null;
        insertPayload.exit_lat = null;
        insertPayload.exit_lng = null;
        insertPayload.exit_accuracy = null;
      }
    } else if (isSignIn) {
      insertPayload.sign_out_time = null;
      insertPayload.auto_sign_out = false;
      insertPayload.auto_sign_out_reason = null;
      insertPayload.exit_time_millis = null;
      insertPayload.exit_time = null;
      insertPayload.exit_lat = null;
      insertPayload.exit_lng = null;
      insertPayload.exit_accuracy = null;
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("attendance")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) {
      const errAny = error as unknown as Record<string, unknown>;
      console.error(
        "POST /api/attendance insert error:",
        errAny?.message ?? error,
        "code:",
        errAny?.code,
        "details:",
        JSON.stringify(errAny?.details ?? errAny)
      );
      throw error;
    }
    if (isSignOut && autoSignOut) {
      logAutoSignOutTriggeredApi(
        "POST /api/attendance [client_auto_sign_out_insert]",
        String(operativeId),
        { newAttendanceRowId: inserted?.id, reason: reasonRaw }
      );
      const pushReason =
        reasonRaw != null && String(reasonRaw).trim()
          ? String(reasonRaw).trim()
          : "native_geofence";
      // NOTE: Client-inserted SIGN OUT rows create a new attendance row rather
      // than closing the original SIGN IN, so the pg_cron fallback may still
      // encounter the orphan open row and try to sign it out (different
      // attendance_id → different dedupe key). That secondary path is a known
      // follow-up; see docs. Dedupe here still prevents *this* row from
      // notifying more than once.
      void sendAttendanceAutoSignOutPush(
        String(operativeId),
        pushReason,
        inserted?.id ? String(inserted.id) : null,
      ).catch((err) =>
        console.error("[push] attendance auto sign-out (client insert):", err)
      );
    }
    return NextResponse.json({ id: inserted?.id }, { status: 201 });
  } catch (e: unknown) {
    const err = e as Record<string, unknown> | null;
    const msg =
      (typeof err?.message === "string" ? err.message : null) ??
      (typeof err?.details === "string" ? err.details : null) ??
      (typeof err?.hint === "string" ? err.hint : null) ??
      (typeof err?.code === "string" ? `Database error (${err.code})` : null) ??
      (err?.error != null && typeof (err.error as Record<string, unknown>)?.message === "string"
        ? (err.error as Record<string, unknown>).message
        : null) ??
      (typeof e === "string" ? e : e instanceof Error ? e.message : null) ??
      (e instanceof Error ? e.toString() : null) ??
      "Server error";
    console.error("POST /api/attendance failed:", msg, "raw:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
