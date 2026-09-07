import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { assertInspectionRecordAccess } from "@/app/api/assets/_utils/inspectionAccess";

/** GET /api/assets/inspections/[id] — single inspection with images & comments. */
export async function GET(
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

    const { data: row, error } = await supabaseAdmin
      .from("asset_inspections")
      .select("id, asset_id, user_id, notes, photo_url, status, steps, created_at")
      .eq("id", inspectionId)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [imagesRes, commentsRes, userRes] = await Promise.all([
      supabaseAdmin
        .from("asset_inspection_images")
        .select("id, photo_url, caption, tags, sort_order, created_at")
        .eq("inspection_id", inspectionId)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("asset_inspection_comments")
        .select("id, user_id, body, created_at")
        .eq("inspection_id", inspectionId)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("users")
        .select("id, name, display_name, email")
        .eq("id", (row as { user_id: string }).user_id)
        .maybeSingle(),
    ]);

    const rec = row as Record<string, unknown>;
    const u = userRes.data as { display_name?: string; name?: string; email?: string } | null;
    const recordedBy =
      (u?.display_name || u?.name || u?.email || String(rec.user_id)).trim() || String(rec.user_id);

    const commentRows = commentsRes.data ?? [];
    const commentUserIds = [...new Set(commentRows.map((c) => (c as { user_id: string }).user_id))];
    const nameByUser: Record<string, string> = {};
    if (commentUserIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id, name, display_name, email")
        .in("id", commentUserIds);
      for (const u of users ?? []) {
        const ur = u as { id: string; name?: string; display_name?: string; email?: string };
        nameByUser[ur.id] = (ur.display_name || ur.name || ur.email || ur.id).trim() || ur.id;
      }
    }

    return NextResponse.json({
      ...rec,
      recorded_by: recordedBy,
      images: imagesRes.data ?? [],
      comments: commentRows.map((c) => {
        const cr = c as { id: string; user_id: string; body: string; created_at: string };
        return {
          ...cr,
          author_name: nameByUser[cr.user_id] ?? cr.user_id,
        };
      }),
    });
  } catch (e) {
    console.error("GET /api/assets/inspections/[id]:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** PATCH — update status (e.g. close inspection), append steps. */
export async function PATCH(
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
    const statusRaw = body?.status != null ? String(body.status).trim().toLowerCase() : "";
    const updates: Record<string, unknown> = {};
    if (statusRaw === "open" || statusRaw === "completed") {
      updates.status = statusRaw;
    }
    const appendSteps = body?.append_steps ?? body?.appendSteps;
    if (Array.isArray(appendSteps) && appendSteps.length > 0) {
      const { data: cur } = await supabaseAdmin
        .from("asset_inspections")
        .select("steps")
        .eq("id", inspectionId)
        .maybeSingle();
      const prev = Array.isArray((cur as { steps?: unknown } | null)?.steps)
        ? ((cur as { steps: unknown[] }).steps ?? [])
        : [];
      updates.steps = [...prev, ...appendSteps];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("asset_inspections").update(updates).eq("id", inspectionId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("PATCH /api/assets/inspections/[id]:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
