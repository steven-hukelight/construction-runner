import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { resolveUserIdFromAuth } from "@/app/api/assets/_utils/inspectionAccess";

function getQueryCompanyId(req: Request): string | null {
  try {
    const u = new URL(req.url);
    return u.searchParams.get("companyId")?.trim() || null;
  } catch {
    return null;
  }
}

async function ensureAdminAccess(req?: Request): Promise<{ companyId: string | null; error: NextResponse | null }> {
  const cookieStore = await cookies();
  const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
  const userEmail = cookieStore.get("user_email")?.value;
  let companyId = cookieStore.get("companyId")?.value?.trim();

  if (role === "operative") {
    return { companyId: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (!companyId || role === "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail,
        role,
        queryCompanyId: req ? getQueryCompanyId(req) : null,
      })) || "";
  }
  return { companyId: companyId ?? null, error: null };
}

/** Any authenticated user with company may create assets. */
async function ensureCreateAccess(req?: Request): Promise<{
  companyId: string | null;
  userId: string | null;
  role: string;
  error: NextResponse | null;
}> {
  const cookieStore = await cookies();
  let uid = cookieStore.get("uid")?.value?.trim();
  const userEmail = cookieStore.get("user_email")?.value;
  const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
  let companyId = cookieStore.get("companyId")?.value?.trim();

  if (!uid && !userEmail) {
    if (req) {
      const auth = await resolveMobileApiAuth(req);
      const bearerUid = await resolveUserIdFromAuth(auth);
      if (bearerUid) {
        const authRole = (auth.role ?? "").toLowerCase();
        let resolvedCompany = (auth.companyId ?? "").trim();
        if (!resolvedCompany || authRole === "superuser") {
          resolvedCompany =
            (await resolveCompanyId({
              cookieCompanyId: auth.companyId ?? undefined,
              userEmail: auth.userEmail ?? undefined,
              role: auth.role ?? undefined,
              queryCompanyId: getQueryCompanyId(req),
            })) || "";
        }
        return {
          companyId: resolvedCompany || null,
          userId: bearerUid,
          role: authRole,
          error: null,
        };
      }
    }
    return { companyId: null, userId: null, role, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!uid && userEmail) {
    const { data } = await supabaseAdmin.from("users").select("id").eq("email", userEmail).maybeSingle();
    uid = (data as { id?: string } | null)?.id;
  }
  if (!companyId || role === "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail,
        role,
        queryCompanyId: req ? getQueryCompanyId(req) : null,
      })) || "";
  }
  /** Mobile often sends Bearer + cookies missing `uid`; merge Supabase user id so creator assignment works. */
  let resolvedUid = uid ?? null;
  if (!resolvedUid && req) {
    const auth = await resolveMobileApiAuth(req);
    const bearerUid = await resolveUserIdFromAuth(auth);
    if (bearerUid) resolvedUid = bearerUid;
  }
  return { companyId: companyId ?? null, userId: resolvedUid, role, error: null };
}

export async function GET(req: Request) {
  try {
    const { companyId, error } = await ensureAdminAccess(req);
    if (error) return error;

    let query = supabaseAdmin
      .from("assets")
      .select("id, name, type, serial_number, status, site_id, company_id, created_at")
      .order("created_at", { ascending: false });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data: assets, error: qErr } = await query;
    if (qErr) {
      console.error("GET /api/assets failed:", qErr);
      return NextResponse.json([], { status: 200 });
    }
    const rows = assets ?? [];
    if (rows.length === 0) return NextResponse.json([]);

    const assetIds = rows.map((r) => (r as { id: string }).id);
    const { data: assigns } = await supabaseAdmin
      .from("asset_assignments")
      .select("asset_id, user_id")
      .in("asset_id", assetIds);
    const userIds = [...new Set((assigns ?? []).map((a) => (a as { user_id: string }).user_id))];
    const userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const [usersRes, profilesRes, personalRes] = await Promise.all([
        supabaseAdmin.from("users").select("id, name, display_name, email").in("id", userIds),
        supabaseAdmin.from("profiles").select("id, display_name").in("id", userIds),
        supabaseAdmin.from("pre_induction_personal").select("user_id, full_name").in("user_id", userIds),
      ]);
      for (const u of usersRes.data ?? []) {
        const id = (u as { id: string }).id;
        const uu = u as { name?: string; display_name?: string; email?: string };
        userMap[id] = uu.name || uu.display_name || uu.email || "";
      }
      for (const p of profilesRes.data ?? []) {
        const id = (p as { id: string }).id;
        const dn = (p as { display_name?: string }).display_name?.trim();
        if (dn && (!userMap[id] || userMap[id] === "")) userMap[id] = dn;
      }
      for (const pr of personalRes.data ?? []) {
        const uid = (pr as { user_id: string }).user_id;
        const fn = (pr as { full_name?: string }).full_name?.trim();
        if (fn) userMap[uid] = fn;
      }
    }
    const assignByAsset = new Map<string, string[]>();
    for (const a of assigns ?? []) {
      const aid = (a as { asset_id: string }).asset_id;
      const uid = (a as { user_id: string }).user_id;
      const name = (userMap[uid] || "").trim() || "Unknown";
      const list = assignByAsset.get(aid) ?? [];
      list.push(name);
      assignByAsset.set(aid, list);
    }
    const result = rows.map((r) => {
      const rec = r as Record<string, unknown>;
      const names = assignByAsset.get(rec.id as string) ?? [];
      return { ...rec, assigned_to: names.join(", ") || null };
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("GET /api/assets failed:", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const { companyId, userId, error } = await ensureCreateAccess(req);
    if (error) return error;
    if (!companyId) {
      return NextResponse.json({ success: false, message: "Company required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? body?.Name ?? "").trim();
    if (!name) {
      return NextResponse.json({ success: false, message: "name is required" }, { status: 400 });
    }

    const type = String(body?.type ?? body?.category ?? "equipment").trim();
    const status = String(body?.status ?? body?.condition ?? "active").trim();
    const serialNumber = body?.serial_number ? String(body.serial_number).trim() : null;
    const siteIdRaw = body?.site_id ?? body?.siteId ?? null;
    const siteId =
      siteIdRaw == null || String(siteIdRaw).trim() === ""
        ? null
        : String(siteIdRaw).trim();

    if (siteId) {
      const { data: site, error: siteErr } = await supabaseAdmin
        .from("sites")
        .select("id, company_id")
        .eq("id", siteId)
        .maybeSingle();
      if (siteErr) {
        console.error("POST /api/assets site lookup failed:", siteErr);
        return NextResponse.json(
          { success: false, message: "Could not validate selected site" },
          { status: 500 },
        );
      }
      if (!site) {
        return NextResponse.json(
          { success: false, message: "Selected site was not found" },
          { status: 400 },
        );
      }
      if ((site.company_id ?? null) !== companyId) {
        return NextResponse.json(
          {
            success: false,
            message: "Selected site does not belong to your company",
          },
          { status: 400 },
        );
      }
    }

    const insertPayload: Record<string, unknown> = {
      company_id: companyId,
      name,
      type,
      status,
      site_id: siteId,
    };
    if (serialNumber) insertPayload.serial_number = serialNumber;
    if (body?.description != null) insertPayload.description = String(body.description).trim();

    const { data, error: insertErr } = await supabaseAdmin
      .from("assets")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertErr) {
      console.error("POST /api/assets failed:", insertErr);
      return NextResponse.json({
        success: false,
        message: insertErr.message ?? "Failed to create asset",
      }, { status: 500 });
    }

    const assetId = data?.id;
    if (assetId && userId) {
      const { error: asnErr } = await supabaseAdmin
        .from("asset_assignments")
        .insert({ asset_id: assetId, user_id: userId });
      if (asnErr) {
        console.error("POST /api/assets asset_assignments insert failed:", asnErr);
      }
    } else if (assetId && !userId) {
      console.warn("POST /api/assets: created asset without assignable userId — assignment skipped");
    }

    return NextResponse.json({ success: true, id: assetId }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("POST /api/assets failed:", e);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
