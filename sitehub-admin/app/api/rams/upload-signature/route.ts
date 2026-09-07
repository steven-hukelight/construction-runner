import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkPreInductionAccess } from "@/app/api/pre-induction/[userId]/_utils/auth";

const MAX_BYTES = 500 * 1024;

/** POST: Upload a signature image for RAMS acknowledgement. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = (body.userId ?? "").toString().trim();
    const ramsId = (body.ramsId ?? "").toString().trim();
    const fileBase64 = body.fileBase64;

    if (!userId || !ramsId || !fileBase64) {
      return NextResponse.json({ error: "userId, ramsId and fileBase64 required" }, { status: 400 });
    }

    const access = await checkPreInductionAccess(userId, req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
    }

    const { data: ram } = await supabaseAdmin.from("rams").select("id, company_id").eq("id", ramsId).single();
    if (!ram) {
      return NextResponse.json({ error: "RAMS document not found" }, { status: 404 });
    }

    const companyId = (ram.company_id ?? "").toString() || "default";
    const buffer = Buffer.from(fileBase64, "base64");
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: "Signature image too large" }, { status: 400 });
    }

    const path = `rams-signatures/${companyId}/${userId}/${ramsId}_${Date.now()}.png`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("company_documents")
      .upload(path, buffer, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("RAMS signature upload failed:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from("company_documents").getPublicUrl(path);

    return NextResponse.json({ signatureUrl: urlData.publicUrl });
  } catch (e) {
    console.error("POST /api/rams/upload-signature:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
