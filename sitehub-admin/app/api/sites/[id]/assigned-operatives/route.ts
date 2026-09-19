import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { canAssignOperativesToSites } from "@/lib/auth/roles";
import { getRestrictedSiteIds } from "@/lib/auth/siteScope";

function cid(x: { company_id?: string | null; main_contractor_id?: string | null }): string | null {
  return (x.main_contractor_id ?? x.company_id ?? null) as string | null;
}

async function canManageSite(siteId: string): Promise<{ ok: boolean; error?: NextResponse }> {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const companyId = cookieStore.get("companyId")?.value;
  const uid = cookieStore.get("uid")?.value;
  if (!canAssignOperativesToSites(role)) {
    return { ok: false, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (role === "superuser") return { ok: true };
  if (!companyId) return { ok: false, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  const restricted = await getRestrictedSiteIds(role, uid);
  if (restricted && !restricted.includes(siteId)) {
    return { ok: false, error: NextResponse.json({ error: "You can only add people to your assigned sites." }, { status: 403 }) };
  }

  const { data: site } = await supabaseAdmin.from("sites").select("*").eq("id", siteId).single();
  if (!site) return { ok: false, error: NextResponse.json({ error: "Site not found" }, { status: 404 }) };

  const mainId = cid(site);
  if (mainId === companyId) return { ok: true };

  const { data: sub } = await supabaseAdmin
    .from("site_subcontractors")
    .select("company_id")
    .eq("site_id", siteId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (sub) return { ok: true };

  return { ok: false, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: siteId } = await params;
  const check = await canManageSite(siteId);
  if (!check.ok) return check.error!;

  const { data: rows } = await supabaseAdmin
    .from("assigned_operatives")
    .select("id, site_id, user_id, userid, assigned_at, assignedat")
    .eq("site_id", siteId);
  const userIds = [...new Set((rows ?? []).map((r) => r.user_id ?? r.userid).filter(Boolean))];
  const { data: users } = userIds.length
    ? await supabaseAdmin.from("users").select("id, company_id").in("id", userIds)
    : { data: [] };
  const companyByUser = Object.fromEntries((users ?? []).map((u) => [u.id, u.company_id ?? ""]));
  const list = (rows ?? []).map((d) => {
    const uid = d.user_id ?? d.userid ?? d.id;
    return {
      ...d,
      id: uid,
      operativeId: uid,
      user_id: uid,
      companyId: companyByUser[uid] ?? null,
    };
  });
  return NextResponse.json(list);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: siteId } = await params;
  const check = await canManageSite(siteId);
  if (!check.ok) return check.error!;

  const body = await req.json().catch(() => ({}));
  const operativeId = body.operativeId?.trim();
  const companyId = (body.company_id ?? body.companyId)?.trim();
  if (!operativeId || !companyId) {
    return NextResponse.json({ error: "operativeId and company_id (or companyId) required" }, { status: 400 });
  }

  const { data: site } = await supabaseAdmin.from("sites").select("rams_version, ramsversion").eq("id", siteId).single();
  const siteRamsVersion = (site?.rams_version ?? site?.ramsversion ?? null) as string | null;
  const siteHasRams = !!siteRamsVersion;

  const { data: existing } = await supabaseAdmin
    .from("assigned_operatives")
    .select("id")
    .eq("site_id", siteId)
    .eq("user_id", operativeId)
    .maybeSingle();
  const now = new Date().toISOString();
  if (existing) {
    const { error: updErr } = await supabaseAdmin.from("assigned_operatives").update({
      assigned_at: now,
      assignedat: now,
      updated_at: now,
    }).eq("id", (existing as { id: string }).id);
    if (updErr) {
      console.error("assigned_operatives update failed:", updErr);
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
  } else {
    const { error: insErr } = await supabaseAdmin.from("assigned_operatives").insert({
      site_id: siteId,
      user_id: operativeId,
      userid: operativeId,
      assigned_at: now,
      assignedat: now,
    });
    if (insErr) {
      console.error("assigned_operatives insert failed:", insErr);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  if (siteHasRams && siteRamsVersion) {
    const { data: current } = await supabaseAdmin.from("pre_induction_training").select("*").eq("user_id", operativeId).maybeSingle();
    const bySite = ((current?.rams_required_version_by_site ?? current?.ramsRequiredVersionBySite) as Record<string, string>) ?? {};
    bySite[siteId] = siteRamsVersion;
    await supabaseAdmin.from("pre_induction_training").upsert(
      {
        user_id: operativeId,
        rams_required_version_by_site: bySite,
        rams_required_version: siteRamsVersion,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: siteId } = await params;
  const check = await canManageSite(siteId);
  if (!check.ok) return check.error!;

  const operativeId = new URL(req.url).searchParams.get("operativeId");
  if (!operativeId) return NextResponse.json({ error: "operativeId required" }, { status: 400 });

  await supabaseAdmin.from("assigned_operatives").delete().eq("site_id", siteId).eq("user_id", operativeId);
  return NextResponse.json({ success: true });
}
