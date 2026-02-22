import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";

function cid(x: { company_id?: string | null }): string | null {
  return (x.company_id ?? null) as string | null;
}

async function canAccessNearMiss(id: string): Promise<NextResponse | null> {
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
  const { data: doc } = await supabaseAdmin.from("near_miss_reports").select("*").eq("id", id).single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!companyId || cid(doc) !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forbid = await canAccessNearMiss(id);
  if (forbid) return forbid;

  const { data, error } = await supabaseAdmin.from("near_miss_reports").select("*").eq("id", id).single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forbid = await canAccessNearMiss(id);
  if (forbid) return forbid;
  const body = await req.json();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.description != null) update.description = body.description;
  if (body.status != null) update.status = body.status;
  if (body.reviewedAt !== undefined)
    update.reviewed_at = body.reviewedAt ? new Date(body.reviewedAt).toISOString() : null;
  if (body.attachments != null) update.attachments = Array.isArray(body.attachments) ? body.attachments : body.attachments;

  const { error } = await supabaseAdmin.from("near_miss_reports").update(update).eq("id", id);

  if (error) {
    console.error("PATCH /api/near-miss/[id] failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
