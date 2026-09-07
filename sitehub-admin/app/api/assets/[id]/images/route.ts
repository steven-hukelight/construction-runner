import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveSignedUrl } from "@/lib/storage/signedUrl";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { assertInspectionAssetAccess } from "@/app/api/assets/_utils/inspectionAccess";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params;
    const auth = await resolveMobileApiAuth(req);
    const access = await assertInspectionAssetAccess(auth, assetId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data: rows } = await supabaseAdmin
      .from("asset_documents")
      .select("id, file_url, created_at, uploaded_by")
      .eq("asset_id", assetId)
      .order("created_at", { ascending: false });

    const data = Array.isArray(rows) ? rows : [];
    const uploaderIds = [...new Set(data.map((r) => (r as { uploaded_by?: string }).uploaded_by).filter(Boolean))] as string[];
    let uploaderMap: Record<string, { name?: string; display_name?: string }> = {};
    if (uploaderIds.length > 0) {
      const { data: users } = await supabaseAdmin.from("users").select("id, name, display_name").in("id", uploaderIds);
      uploaderMap = Object.fromEntries((users ?? []).map((u) => [u.id, { name: u.name, display_name: u.display_name }]));
    }
    const enriched = await Promise.all(
      data.map(async (r) => {
        const rec = r as { uploaded_by?: string; id: string; file_url: string; created_at: string };
        const uploader = rec.uploaded_by ? uploaderMap[rec.uploaded_by] : null;
        let view_url: string | null = null;
        if (rec.file_url?.trim()) {
          try {
            view_url = await resolveSignedUrl(rec.file_url.trim());
          } catch {
            view_url = null;
          }
        }
        return {
          ...rec,
          uploaded_by_name: uploader?.display_name || uploader?.name || null,
          /** Time-limited URL for img / Image.network when the bucket is private. */
          view_url,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (e) {
    console.error("GET /api/assets/[id]/images failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
