import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { canCreateAndAssignSites } from "@/lib/auth/roles";

async function assertCanAssignSites() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  if (!canCreateAndAssignSites(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let companyId = cookieStore.get("companyId")?.value?.trim();
  if (!companyId && (role ?? "").toLowerCase() !== "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || undefined;
  }
  return { role, companyId: companyId || "" };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertCanAssignSites();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("user_sites")
    .select("site_id")
    .eq("user_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    siteIds: (data ?? []).map((r) => String(r.site_id)),
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertCanAssignSites();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id, company_id, role")
    .eq("id", id)
    .maybeSingle();
  if (!userRow) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const roleLower = ((gate as { role?: string }).role ?? "").toLowerCase();
  const companyId = (gate as { companyId: string }).companyId;
  const targetCompany = String(userRow.company_id ?? "").trim();
  if (roleLower !== "superuser" && companyId && targetCompany !== companyId) {
    return NextResponse.json({ error: "Cannot assign sites for another company" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const rawIds = Array.isArray(body.siteIds) ? body.siteIds : [];
  const siteIds = [...new Set(rawIds.map((x: unknown) => String(x).trim()).filter(Boolean))];

  if (siteIds.length > 0) {
    let siteQuery = supabaseAdmin.from("sites").select("id, company_id").in("id", siteIds);
    if (roleLower !== "superuser" && (targetCompany || companyId)) {
      siteQuery = siteQuery.eq("company_id", targetCompany || companyId);
    }
    const { data: sites } = await siteQuery;
    const allowed = new Set((sites ?? []).map((s) => String(s.id)));
    if (allowed.size !== siteIds.length) {
      return NextResponse.json(
        { error: "One or more sites are not in this company." },
        { status: 400 }
      );
    }
  }

  const { error: delErr } = await supabaseAdmin.from("user_sites").delete().eq("user_id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (siteIds.length > 0) {
    const { error: insErr } = await supabaseAdmin.from("user_sites").insert(
      siteIds.map((site_id) => ({ user_id: id, site_id }))
    );
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, siteIds });
}
