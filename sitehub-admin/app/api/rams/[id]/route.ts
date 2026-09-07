import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { onRamsApprovedForSite } from "@/lib/ramsCompliance";
import { writeAuditLog } from "@/lib/auditLog";
import { resolveCompanyId } from "@/lib/auth/companyId";

function cid(x: { company_id?: string | null }): string | null {
  return (x.company_id ?? null) as string | null;
}

async function ensureRAMAccess(id: string): Promise<NextResponse | null> {
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

  const { data: ram, error: ramFetchErr } = await supabaseAdmin
    .from("rams")
    .select("*")
    .eq("id", id)
    .single();
  if (ramFetchErr || !ram) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ramCompanyId = cid(ram);
  if (ramCompanyId === companyId) return null;

  const siteId = ram.site_id;
  if (siteId) {
    const { data: site } = await supabaseAdmin.from("sites").select("*").eq("id", siteId).single();
    if (site) {
      const mainId = site.main_contractor_id ?? cid(site);
      if (mainId === companyId) return null;
    }
    const { data: sub } = await supabaseAdmin
      .from("site_subcontractors")
      .select("company_id")
      .eq("site_id", siteId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (sub) return null;
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forbid = await ensureRAMAccess(id);
  if (forbid) return forbid;

  const { data: ram, error } = await supabaseAdmin
    .from("rams")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !ram) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let siteName: string | null = null;
  const sid = ram.site_id as string | null | undefined;
  if (sid) {
    const { data: site } = await supabaseAdmin.from("sites").select("name").eq("id", sid).maybeSingle();
    siteName = (site?.name as string | undefined) ?? null;
  }

  const fileUrl = (ram.url ?? ram.file_url ?? null) as string | null;

  return NextResponse.json({
    id: ram.id,
    title: ram.title ?? null,
    description: (ram as { description?: string | null }).description ?? null,
    status: ram.status ?? null,
    version: ram.version ?? null,
    url: fileUrl,
    fileUrl,
    siteId: sid ?? null,
    siteName,
    companyId: ram.company_id ?? null,
    createdAt: ram.created_at ?? null,
    updatedAt: ram.updated_at ?? null,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forbid = await ensureRAMAccess(id);
  if (forbid) return forbid;
  const body = await req.json();
  const newStatus = (body.status as string) || "";

  const { data: ram } = await supabaseAdmin.from("rams").select("site_id").eq("id", id).single();
  const siteId = ram?.site_id ?? null;

  await supabaseAdmin.from("rams").update({ status: newStatus }).eq("id", id);

  if (newStatus === "APPROVED" && siteId) {
    try {
      await onRamsApprovedForSite(supabaseAdmin, siteId);
      const cookieStore = await cookies();
      const email = cookieStore.get("user_email")?.value;
      const { data: users } = email ? await supabaseAdmin.from("users").select("id").eq("email", email).limit(1) : { data: [] };
      const actorId = users?.[0]?.id ?? "unknown";
      const { data: siteRow } = await supabaseAdmin.from("sites").select("rams_version, ramsversion").eq("id", siteId).single();
      const newVersion = (siteRow?.rams_version ?? siteRow?.ramsversion ?? null) as string | null;
      await writeAuditLog({
        userId: siteId,
        action: "rams_version_update",
        timestamp: new Date(),
        actorId,
        actorEmail: email ?? null,
        metadata: { ramsId: id, siteId, newVersion },
      });
    } catch (e) {
      console.error("RAMS approval post-update failed:", e);
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forbid = await ensureRAMAccess(id);
  if (forbid) return forbid;
  await supabaseAdmin.from("rams").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
