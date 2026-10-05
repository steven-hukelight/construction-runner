import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { canAssignSuperAdminRole, usesAssignedSites } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";
    let role = cookieStore.get("role")?.value;
    const companyIdParam = searchParams.get("companyId");
    let companyId = companyIdParam || cookieStore.get("companyId")?.value?.trim();

    if (!companyId && role !== "superuser") {
      const email = cookieStore.get("user_email")?.value;
      if (email) {
        const { data: userRows } = await supabaseAdmin.from("users").select("role, company_id").eq("email", email).limit(1);
        if (userRows?.[0]) {
          const u = userRows[0];
          if (!role) role = u.role ?? undefined;
          if (u.company_id) companyId = String(u.company_id).trim();
          if (String(u.role ?? "").toLowerCase() === "superuser") role = "superuser";
        }
      }
    }

    if (all && role !== "superuser") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const roleLower = (role ?? "").toLowerCase();
    if (roleLower === "operative") {
      const email = cookieStore.get("user_email")?.value;
      if (!email) return NextResponse.json([]);
      const { data: me } = await supabaseAdmin.from("users").select("*").eq("email", email).limit(1).maybeSingle();
      if (!me) return NextResponse.json([]);
      const u = me as Record<string, unknown>;
      const { data: personalRows } = await supabaseAdmin
        .from("pre_induction_personal")
        .select("user_id, full_name, phone, data")
        .eq("user_id", u.id)
        .limit(1);
      const pr = personalRows?.[0] as { full_name?: string; phone?: string; data?: Record<string, unknown> } | undefined;
      const d = pr?.data ?? {};
      const name = (u.name ?? u.display_name ?? pr?.full_name ?? d.full_name ?? d.fullName ?? u.email) as string;
      const phone = (u.phone ?? pr?.phone ?? d.phone ?? "") as string;
      const mapped = {
        ...u,
        name: name || u.name,
        phone,
        lastLogin: u.last_login ?? u.lastLogin ?? null,
        company_id: u.company_id,
        companyId: u.company_id,
      };
      return NextResponse.json([mapped]);
    }

    let query = supabaseAdmin.from("users").select("*").order("created_at", { ascending: false }).limit(500);
    if (role === "superuser") {
      if (all) {
        /* no company filter */
      } else if (companyId) {
        query = query.eq("company_id", companyId);
      } else {
        return NextResponse.json([]);
      }
    } else {
      if (!companyId) return NextResponse.json([]);
      query = query.eq("company_id", companyId);
    }

    const { data: users } = await query;
    const allUserIds = (users ?? []).map((u: Record<string, unknown>) => u.id as string);
    // Enrich with name and phone from pre_induction_personal
    const nameMap: Record<string, string> = {};
    const phoneMap: Record<string, string> = {};
    if (allUserIds.length > 0) {
      const { data: personalRows } = await supabaseAdmin
        .from("pre_induction_personal")
        .select("user_id, full_name, phone, data")
        .in("user_id", allUserIds);
      for (const p of personalRows ?? []) {
        const pr = p as { user_id: string; full_name?: string | null; phone?: string | null; data?: Record<string, unknown> };
        const pid = pr.user_id;
        const d = pr.data ?? {};
        const fn = (pr.full_name ?? d.full_name ?? d.fullName ?? "") as string;
        const ph = (pr.phone ?? d.phone ?? "") as string;
        if (fn && String(fn).trim()) nameMap[pid] = String(fn).trim();
        if (ph && String(ph).trim()) phoneMap[pid] = String(ph).trim();
      }
    }
    const mapped = (users || []).map((u: Record<string, unknown>) => {
      const personalName = nameMap[u.id as string];
      const displayName =
        (typeof u.display_name === "string" && u.display_name.trim()) ||
        (typeof personalName === "string" && personalName.trim()) ||
        (typeof u.name === "string" && u.name.trim() && !String(u.name).includes("@")
          ? String(u.name).trim()
          : "") ||
        "";
      const name =
        displayName ||
        personalName ||
        (typeof u.name === "string" ? u.name : "") ||
        (typeof u.email === "string" ? u.email : "");
      const phone = (u.phone ?? phoneMap[u.id as string] ?? "") as string;
      const lastLogin = u.last_login ?? u.lastLogin ?? null;
      return {
        ...u,
        name: name || u.name,
        display_name: displayName || u.display_name || null,
        displayName: displayName || undefined,
        phone: phone || u.phone,
        lastLogin,
        company_id: u.company_id,
        companyId: u.company_id,
      };
    });
    return NextResponse.json(mapped);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/users failed:", message);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  let companyId = cookieStore.get("companyId")?.value;
  if (!companyId && role !== "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || undefined;
  }
  const assignedCompanyId = role === "superuser" ? (body.company_id ?? body.companyId ?? companyId ?? null) : (companyId ?? null);

  if (!assignedCompanyId) {
    return NextResponse.json({ error: "company_id required" }, { status: 400 });
  }

  const roleVal = String(body.role ?? "operative").toLowerCase().trim();
  if (roleVal === "admin" && !canAssignSuperAdminRole(role)) {
    return NextResponse.json(
      { error: "Only a Super Admin can invite another Super Admin" },
      { status: 403 }
    );
  }

  const rawSiteIds = Array.isArray(body.siteIds) ? (body.siteIds as unknown[]) : [];
  const requestedSiteIds = [...new Set<string>(rawSiteIds.map((x) => String(x).trim()).filter((x) => x.length > 0))];
  if (usesAssignedSites(roleVal) && requestedSiteIds.length === 0) {
    return NextResponse.json({ error: "Select at least one site" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("users").insert({
    id: crypto.randomUUID(),
    email: body.email,
    display_name: body.name ?? body.display_name ?? body.displayName ?? null,
    role: roleVal,
    company_id: assignedCompanyId,
  }).select("id").single();

  if (error) {
    console.error("POST /api/users failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (usesAssignedSites(roleVal) && data?.id && requestedSiteIds.length > 0) {
    const { data: allowedSites } = await supabaseAdmin
      .from("sites")
      .select("id")
      .eq("company_id", assignedCompanyId)
      .in("id", requestedSiteIds);
    const allowed = new Set((allowedSites ?? []).map((s) => String(s.id)));
    const siteIds = requestedSiteIds.filter((sid) => allowed.has(sid));
    if (siteIds.length > 0) {
      await supabaseAdmin.from("user_sites").insert(
        siteIds.map((site_id) => ({ user_id: data.id, site_id }))
      );
    }
  }

  return NextResponse.json({ id: data?.id }, { status: 201 });
}
