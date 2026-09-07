import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { assertInspectionAssetAccess } from "@/app/api/assets/_utils/inspectionAccess";

export async function POST(req: Request) {
  try {
    const auth = await resolveMobileApiAuth(req);
    const body = await req.json().catch(() => ({}));
    const assetId = body?.asset_id ?? body?.assetId;
    const notes = body?.notes != null ? String(body.notes).trim() : null;
    const photoUrl = body?.photo_url ?? body?.photoUrl ?? null;
    const rawUrls = body?.photo_urls ?? body?.photoUrls;
    const photoUrls: string[] = Array.isArray(rawUrls)
      ? rawUrls.map((u: unknown) => String(u ?? "").trim()).filter((u) => u.length > 0)
      : [];
    const legacyFirst = photoUrl ? String(photoUrl).trim() : "";
    if (legacyFirst && photoUrls.length === 0) photoUrls.push(legacyFirst);

    const stepsRaw = body?.steps;
    const steps: unknown[] = Array.isArray(stepsRaw) ? stepsRaw : [];
    const statusRaw = body?.status != null ? String(body.status).trim().toLowerCase() : "";
    const status =
      statusRaw === "open" || statusRaw === "completed" ? statusRaw : "completed";

    if (!assetId) return NextResponse.json({ error: "asset_id required" }, { status: 400 });

    const access = await assertInspectionAssetAccess(auth, String(assetId));
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const userId = access.userId;

    const { data, error } = await supabaseAdmin
      .from("asset_inspections")
      .insert({
        asset_id: assetId,
        user_id: userId,
        notes,
        photo_url: photoUrls[0] ?? photoUrl ?? null,
        status,
        steps: steps.length > 0 ? steps : [],
      })
      .select("id")
      .single();

    if (error) {
      console.error("POST /api/assets/inspection failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const inspectionId = data?.id as string;
    if (photoUrls.length > 0) {
      const rows = photoUrls.map((url, i) => ({
        inspection_id: inspectionId,
        photo_url: url,
        sort_order: i,
      }));
      const { error: imgErr } = await supabaseAdmin.from("asset_inspection_images").insert(rows);
      if (imgErr) {
        console.error("POST /api/assets/inspection images:", imgErr);
      }
    }

    return NextResponse.json({ id: inspectionId }, { status: 201 });
  } catch (e) {
    console.error("POST /api/assets/inspection failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
