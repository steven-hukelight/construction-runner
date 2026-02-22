import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";

function cid(x: { company_id?: string | null }): string | null {
  return (x.company_id ?? null) as string | null;
}

async function canAccessAlert(id: string): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  if ((role ?? "").toLowerCase() === "superuser") return null;

  let companyId = cookieStore.get("companyId")?.value;
  if (!companyId) {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || undefined;
  }
  const { data: doc } = await supabaseAdmin.from("safety_alerts").select("*").eq("id", id).single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!companyId || cid(doc) !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forbid = await canAccessAlert(id);
  if (forbid) return forbid;
  const body = await req.json();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title != null) update.title = body.title;
  if (body.description != null) update.description = body.description;
  if (body.severity != null) update.severity = body.severity;
  if (body.expiresAt != null) update.expires_at = body.expiresAt ? new Date(body.expiresAt).toISOString() : null;

  await supabaseAdmin.from("safety_alerts").update(update).eq("id", id);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forbid = await canAccessAlert(id);
  if (forbid) return forbid;

  await supabaseAdmin.from("safety_alerts").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
