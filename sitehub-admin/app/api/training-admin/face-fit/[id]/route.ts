import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveTrainingOfficeAuth } from "@/lib/training/officeAuth";
import { FACE_FIT_BUCKET } from "@/lib/training/service";

async function loadOwned(id: string, companyId: string) {
  const { data } = await supabaseAdmin
    .from("face_fit_tests")
    .select("id, company_id, certificate_path")
    .eq("id", id)
    .maybeSingle();
  return data && data.company_id === companyId ? data : null;
}

/** Redirects to a short-lived link to the certificate. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveTrainingOfficeAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const row = await loadOwned(id, auth.companyId);
  if (!row?.certificate_path) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data, error } = await supabaseAdmin.storage.from(FACE_FIT_BUCKET).createSignedUrl(row.certificate_path, 300);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "Couldn't open the certificate" }, { status: 502 });
  return NextResponse.redirect(data.signedUrl);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveTrainingOfficeAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.canRecord) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const row = await loadOwned(id, auth.companyId);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { error } = await supabaseAdmin.from("face_fit_tests").delete().eq("id", id);
  if (error) {
    console.error("DELETE /api/training-admin/face-fit/[id]:", error);
    return NextResponse.json({ error: "Couldn't delete" }, { status: 500 });
  }
  if (row.certificate_path) await supabaseAdmin.storage.from(FACE_FIT_BUCKET).remove([row.certificate_path]);
  return NextResponse.json({ ok: true });
}
