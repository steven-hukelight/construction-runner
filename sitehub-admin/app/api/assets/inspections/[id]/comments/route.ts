import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { assertInspectionRecordAccess } from "@/app/api/assets/_utils/inspectionAccess";

/** POST /api/assets/inspections/[id]/comments */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inspectionId } = await params;
    if (!inspectionId) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const auth = await resolveMobileApiAuth(req);
    const access = await assertInspectionRecordAccess(auth, inspectionId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const body = await req.json().catch(() => ({}));
    const bodyText = body?.body != null ? String(body.body).trim() : "";
    if (!bodyText) {
      return NextResponse.json({ error: "body required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("asset_inspection_comments")
      .insert({
        inspection_id: inspectionId,
        user_id: access.userId,
        body: bodyText,
      })
      .select("id, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id: data?.id, created_at: data?.created_at }, { status: 201 });
  } catch (e) {
    console.error("POST /api/assets/inspections/[id]/comments:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
