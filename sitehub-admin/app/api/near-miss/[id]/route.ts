import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { authorizeNearMissReport } from "@/lib/auth/nearMissAccess";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await authorizeNearMissReport(req, id);
  if (!access.ok) return access.response;

  return NextResponse.json(access.report, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await authorizeNearMissReport(req, id);
  if (!access.ok) return access.response;
  const body = await req.json();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.description != null) update.description = body.description;
  if (body.status != null) update.status = body.status;
  if (body.reviewedAt !== undefined) {
    update.reviewed_at = body.reviewedAt ? new Date(body.reviewedAt).toISOString() : null;
    update.status = body.reviewedAt ? "reviewed" : "pending";
  }
  if (body.attachments != null) update.attachments = Array.isArray(body.attachments) ? body.attachments : body.attachments;

  const { error } = await supabaseAdmin.from("near_miss_reports").update(update).eq("id", id);

  if (error) {
    console.error("PATCH /api/near-miss/[id] failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await authorizeNearMissReport(req, id);
  if (!access.ok) return access.response;

  const { error } = await supabaseAdmin.from("near_miss_reports").delete().eq("id", id);
  if (error) {
    console.error("DELETE /api/near-miss/[id] failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
