import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { getRamsStatusForSite, isRamsCompliant, type RamsTrainingData } from "@/lib/ramsCompliance";

export const dynamic = "force-dynamic";

/** Normalize attendance rows: add camelCase aliases and enrich with user/site names for display */
async function normalizeAttendanceRows(rows: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
  if (!rows.length) return [];
  const userIds = [...new Set(rows.map((r) => r.user_id as string).filter(Boolean))];
  const siteIds = [...new Set(rows.map((r) => r.site_id as string).filter(Boolean))];

  const [usersRes, sitesRes] = await Promise.all([
    userIds.length > 0 ? supabaseAdmin.from("users").select("id, name, display_name, email").in("id", userIds) : { data: [] },
    siteIds.length > 0 ? supabaseAdmin.from("sites").select("id, name").in("id", siteIds) : { data: [] },
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
    const siteName = site?.name;
    return {
      ...r,
      userId: r.user_id,
      operativeId: r.user_id,
      uid: r.user_id,
      siteId: r.site_id,
      companyId: r.company_id ?? r.companyid,
      name: name ?? r.name,
      displayName: name ?? r.displayName,
      operativeName: name ?? r.operativeName,
      siteName: siteName ?? r.siteName ?? r.site_name,
      action: (r.action != null && String(r.action).trim()) ? String(r.action).trim() : "SIGN IN",
    };
  });
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
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

    const limit = limitParam ? Math.max(1, Math.min(500, parseInt(limitParam))) : 200;
    const siteIdParam = url.searchParams.get("siteId")?.trim() || url.searchParams.get("site_id")?.trim() || undefined;
    const userIdParam = url.searchParams.get("userId")?.trim() || url.searchParams.get("user_id")?.trim() || undefined;
    const dateParam = url.searchParams.get("date")?.trim() || undefined; // YYYY-MM-DD, filter to that day (local date)

    let dayStart: string | undefined;
    let dayEnd: string | undefined;
    if (dateParam) {
      const [y, m, d] = dateParam.split("-").map(Number);
      if (y && m && d) {
        dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
        dayEnd = new Date(y, m - 1, d + 1, 0, 0, 0, 0).toISOString();
      }
    }

    const applyExtraFilters = (q: ReturnType<ReturnType<typeof supabaseAdmin.from>["select"]>) => {
      if (siteIdParam) q = q.eq("site_id", siteIdParam);
      if (userIdParam) q = q.eq("user_id", userIdParam);
      if (dayStart && dayEnd) q = q.gte("timestamp", dayStart).lt("timestamp", dayEnd);
      return q;
    };

    if (role === "superuser") {
      companyId = url.searchParams.get("companyId") || (companyId ?? undefined);
      if (companyId) {
        const { data: users } = await supabaseAdmin.from("users").select("id").eq("company_id", companyId);
        const userIds = (users ?? []).map((u) => u.id);
        if (userIds.length === 0) return NextResponse.json([]);
        let q = supabaseAdmin.from("attendance").select("*").in("user_id", userIds);
        q = applyExtraFilters(q);
        const { data: att } = await q.order("timestamp", { ascending: false }).limit(limit);
        const normalized = await normalizeAttendanceRows(att ?? []);
        return NextResponse.json(normalized);
      }
      let q = supabaseAdmin.from("attendance").select("*");
      q = applyExtraFilters(q);
      const { data: att } = await q.order("timestamp", { ascending: false }).limit(limit);
      const normalized = await normalizeAttendanceRows(att ?? []);
      return NextResponse.json(normalized);
    }

    const roleLower = (role ?? "").toLowerCase();
    if (roleLower === "operative") {
      const { data: me } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", cookieStore.get("user_email")?.value ?? "")
        .maybeSingle();
      if (me?.id) {
        let q = supabaseAdmin.from("attendance").select("*").eq("user_id", me.id);
        if (siteIdParam) q = q.eq("site_id", siteIdParam);
        if (dayStart && dayEnd) q = q.gte("timestamp", dayStart).lt("timestamp", dayEnd);
        const { data: att } = await q.order("timestamp", { ascending: false }).limit(limit);
        const normalized = await normalizeAttendanceRows(att ?? []);
        return NextResponse.json(normalized);
      }
      return NextResponse.json([]);
    }

    if (companyId) {
      const { data: users } = await supabaseAdmin.from("users").select("id").eq("company_id", companyId);
      const userIds = (users ?? []).map((u) => u.id);
      if (userIds.length === 0) return NextResponse.json([], { status: 200 });
      let q = supabaseAdmin.from("attendance").select("*").in("user_id", userIds);
      q = applyExtraFilters(q);
      const { data: att } = await q.order("timestamp", { ascending: false }).limit(limit);
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
    const name = body.name;
    const siteId = body.site_id ?? body.siteId;
    const siteName = body.site_name ?? body.siteName;
    const action = body.action;
    const notes = body.notes;
    const email = body.email;
    if (!operativeId || !action) return NextResponse.json({ error: "operativeId and action required" }, { status: 400 });

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
    const role = cookieStore.get("role")?.value;
    const url = new URL(req.url);
    let companyId = cookieStore.get("companyId")?.value?.trim();
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || undefined;
    }
    // Superuser: company can come from body (mobile extraData) or query param (ApiClient adds ?companyId=)
    const bodyCompanyId = body.company_id ?? body.companyId ?? body.companyid;
    const queryCompanyId = url.searchParams.get("companyId")?.trim() || undefined;
    const assignedCompanyId =
      role === "superuser"
        ? (bodyCompanyId ?? queryCompanyId ?? companyId ?? null)
        : (companyId ?? null);
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
    if (roleLower === "operative") {
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
    const isSignIn = actionNormalized === "IN" || actionNormalized === "SIGN_IN" || actionNormalized === "CHECKIN";
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

    const storedAction = isSignIn ? "SIGN IN" : "SIGN OUT";
    const insertPayload: Record<string, unknown> = {
      id: randomUUID(),
      user_id: operativeId,
      site_id: siteId && String(siteId).trim() ? String(siteId).trim() : null,
      timestamp: new Date().toISOString(),
      action: storedAction,
      notes: notes ? String(notes) : null,
    };
    if (assignedCompanyId) insertPayload.company_id = String(assignedCompanyId);

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
