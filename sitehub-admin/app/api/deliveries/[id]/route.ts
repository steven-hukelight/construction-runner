import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";

function cid(x: { company_id?: string | null }): string | null {
  return (x.company_id ?? null) as string | null;
}

async function ensureDeliveryAccess(id: string): Promise<NextResponse | null> {
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
  if (!companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data } = await supabaseAdmin.from("deliveries").select("*").eq("id", id).single();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cid(data) !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forbid = await ensureDeliveryAccess(id);
  if (forbid) return forbid;
  const cookieStore = await cookies();
  const companyId = cookieStore.get("companyId")?.value;
  const { data } = await supabaseAdmin
    .from("deliveries")
    .select("id, reference, site_id, company_id, created_by, delivered_by, status, scheduled_at, notes, wholesaler, pod_url, pod_photos, load_url, load_photos, site_wide, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!data || (data as { company_id?: string }).company_id !== companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const siteId = (data as { site_id?: string }).site_id;
  const deliveredById = (data as { delivered_by?: string | null }).delivered_by;
  let site = "";
  let deliveredByName = "";
  if (siteId) {
    const { data: siteRow } = await supabaseAdmin.from("sites").select("name").eq("id", siteId).maybeSingle();
    site = (siteRow?.name as string) ?? "";
  }
  if (deliveredById) {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("display_name, email")
      .eq("id", deliveredById)
      .maybeSingle();
    deliveredByName =
      String((userRow as { display_name?: string | null } | null)?.display_name ?? "").trim() ||
      String((userRow as { email?: string | null } | null)?.email ?? "").trim();
  }
  return NextResponse.json({ ...data, site, deliveredByName });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forbid = await ensureDeliveryAccess(id);
  if (forbid) return forbid;
  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (body.status != null) updates.status = body.status;
  if (body.siteId != null) {
    updates.site_id = body.siteId;
  }
  if (body.site != null) updates.site = body.site;
  if (body.scheduledAt != null) updates.scheduled_at = body.scheduledAt;
  if (Object.keys(updates).length > 0) {
    await supabaseAdmin.from("deliveries").update(updates).eq("id", id);
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forbid = await ensureDeliveryAccess(id);
  if (forbid) return forbid;
  await supabaseAdmin.from("deliveries").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
