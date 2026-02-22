import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkPreInductionAccess } from "../_utils/auth";
import { updatePreInductionStatus } from "../_utils/status";

function toIso(val: string | null): string | null {
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
    const payload: Record<string, unknown> = {
      operative_declaration_accepted: !!body.operativeDeclarationAccepted,
      operative_declaration_accepted_at: body.operativeDeclarationAccepted
        ? (toIso(body.operativeDeclarationAcceptedAt) ?? new Date().toISOString())
        : null,
      operative_signature_url: body.operativeSignatureUrl ?? null,
      supervisor_declaration_accepted: !!body.supervisorDeclarationAccepted,
      supervisor_declaration_accepted_at: body.supervisorDeclarationAccepted
        ? (toIso(body.supervisorDeclarationAcceptedAt) ?? new Date().toISOString())
        : null,
      notes: body.notes ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabaseAdmin
      .from("pre_induction_declarations")
      .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" });
    if (upsertErr) {
      console.error("declarations upsert failed:", upsertErr);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }
    await updatePreInductionStatus(userId);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST pre-induction declarations:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
