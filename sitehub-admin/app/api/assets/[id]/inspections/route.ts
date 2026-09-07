import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { assertInspectionAssetAccess } from "@/app/api/assets/_utils/inspectionAccess";

/** GET /api/assets/[id]/inspections — list inspections (web dashboard + mobile Bearer). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params;
    if (!assetId) {
      return NextResponse.json({ error: "asset id required" }, { status: 400 });
    }

    const auth = await resolveMobileApiAuth(req);
    const access = await assertInspectionAssetAccess(auth, assetId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data: rows, error } = await supabaseAdmin
      .from("asset_inspections")
      .select("id, notes, photo_url, status, steps, created_at, user_id")
      .eq("asset_id", assetId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET /api/assets/[id]/inspections:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = rows ?? [];
    const inspIds = list.map((r) => (r as { id: string }).id);
    const imagesByInspection = new Map<
      string,
      { id: string; photo_url: string; caption: string | null; tags: unknown; sort_order: number }[]
    >();
    if (inspIds.length > 0) {
      const { data: imgs } = await supabaseAdmin
        .from("asset_inspection_images")
        .select("id, inspection_id, photo_url, caption, tags, sort_order")
        .in("inspection_id", inspIds)
        .order("sort_order", { ascending: true });
      for (const img of imgs ?? []) {
        const ir = img as {
          inspection_id: string;
          id: string;
          photo_url: string;
          caption: string | null;
          tags: unknown;
          sort_order: number;
        };
        const arr = imagesByInspection.get(ir.inspection_id) ?? [];
        arr.push({
          id: ir.id,
          photo_url: ir.photo_url,
          caption: ir.caption,
          tags: ir.tags,
          sort_order: ir.sort_order,
        });
        imagesByInspection.set(ir.inspection_id, arr);
      }
    }

    const userIds = [...new Set(list.map((r) => (r as { user_id: string }).user_id).filter(Boolean))];
    const nameByUser: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id, name, display_name, email")
        .in("id", userIds);
      for (const u of users ?? []) {
        const rec = u as { id: string; name?: string; display_name?: string; email?: string };
        nameByUser[rec.id] =
          (rec.display_name || rec.name || rec.email || rec.id).trim() || rec.id;
      }
    }

    const result = list.map((r) => {
      const rec = r as {
        id: string;
        notes: string | null;
        photo_url: string | null;
        status?: string | null;
        steps?: unknown;
        created_at: string;
        user_id: string;
      };
      return {
        id: rec.id,
        notes: rec.notes,
        photo_url: rec.photo_url,
        status: rec.status ?? "completed",
        steps: rec.steps ?? [],
        images: imagesByInspection.get(rec.id) ?? [],
        created_at: rec.created_at,
        user_id: rec.user_id,
        recorded_by: nameByUser[rec.user_id] ?? rec.user_id,
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("GET /api/assets/[id]/inspections failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
