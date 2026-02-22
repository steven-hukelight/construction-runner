import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { checkPreInductionAccess } from "../_utils/auth";
import { updatePreInductionStatus } from "../_utils/status";

function toTimestamp(val: string | null): string | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const access = await checkPreInductionAccess(userId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
    }

    const body = await req.json();
    // Accept both camelCase (web) and snake_case (mobile)
    const rawRecords = body.trainingRecords ?? body.training_records ?? [];
    const records = Array.isArray(rawRecords) ? rawRecords : [];
    const trainingRecords = records.map((r: Record<string, unknown>) => ({
      type: r.type ?? "Training",
      completedAt: (r.completedAt ?? r.completed_at) ? toTimestamp(String(r.completedAt ?? r.completed_at)) : null,
      expiry: (r.expiry ?? r.expiry_date) ? toTimestamp(String(r.expiry ?? r.expiry_date)) : null,
      fileUrl: r.fileUrl ?? r.file_url ?? null,
      verified: !!r.verified,
      notes: r.notes ?? null,
    }));

    const ramsAccepted = !!(body.ramsAccepted ?? body.rams_accepted);
    const payload: Record<string, unknown> = {
      training_records: trainingRecords,
      rams_accepted: ramsAccepted,
      rams_accepted_at: ramsAccepted ? (body.ramsAcceptedAt ?? body.rams_accepted_at ?? new Date().toISOString()) : null,
      rams_version: body.ramsVersion ?? body.rams_version ?? null,
      updated_at: new Date().toISOString(),
    };
    if (body.ramsRequiredVersion !== undefined) payload.rams_required_version = body.ramsRequiredVersion;
    if (body.ramsRequiredVersionBySite !== undefined) payload.rams_required_version_by_site = body.ramsRequiredVersionBySite;
    if (body.ramsStatus !== undefined) payload.rams_status = body.ramsStatus;

    const { error: upsertErr } = await supabaseAdmin
      .from("pre_induction_training")
      .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" });
    if (upsertErr) {
      console.error("training upsert failed:", upsertErr);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }
    await updatePreInductionStatus(userId);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST pre-induction training:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
