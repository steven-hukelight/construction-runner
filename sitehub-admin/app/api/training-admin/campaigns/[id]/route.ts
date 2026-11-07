import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveTrainingOfficeAuth } from "@/lib/training/officeAuth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveTrainingOfficeAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.canRecord) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { data: row } = await supabaseAdmin.from("training_campaigns").select("company_id").eq("id", id).maybeSingle();
  if (!row || row.company_id !== auth.companyId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { error } = await supabaseAdmin.from("training_campaigns").delete().eq("id", id);
  if (error) {
    console.error("DELETE /api/training-admin/campaigns/[id]:", error);
    return NextResponse.json({ error: "Couldn't delete" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
