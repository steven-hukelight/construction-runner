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
  if (role === "superuser") return null;
  if (!companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data } = await supabaseAdmin.from("deliveries").select("*").eq("id", id).single();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cid(data) !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
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
