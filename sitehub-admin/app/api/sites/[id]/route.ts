import { ensureSiteAccess } from "@/app/api/sites/_utils/siteAccess";
import { serializeSite } from "@/app/api/sites/_utils/serializeSite";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forbid = await ensureSiteAccess(id);
  if (forbid) return forbid;

  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  if (typeof body.name === "string") updateData.name = body.name;
  if (body.location) updateData.location = body.location;
  if (Object.prototype.hasOwnProperty.call(body, "geofence")) {
    updateData.geofence = body.geofence ?? null;
    const lat = body.geofence?.center?.lat ?? body.location?.lat;
    const lng = body.geofence?.center?.lng ?? body.location?.lng;
    const radiusMeters = body.geofence?.radiusMeters;
    updateData.latitude = lat ?? null;
    updateData.longitude = lng ?? null;
    updateData.radius_meters = radiusMeters ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "showOnMap") ||
      Object.prototype.hasOwnProperty.call(body, "show_on_map")) {
    updateData.show_on_map = body.showOnMap ?? body.show_on_map ?? true;
  }
  if (Object.prototype.hasOwnProperty.call(body, "active")) updateData.active = body.active ?? true;
  if (Object.prototype.hasOwnProperty.call(body, "managerId")) {
    const next = typeof body.managerId === "string" ? body.managerId.trim() : body.managerId;
    updateData.manager_id = next ? String(next) : null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "inductionRequired")) updateData.induction_required = !!body.inductionRequired;
  if (typeof body.mainContractorId === "string") updateData.main_contractor_id = body.mainContractorId.trim() || null;

  if (Object.keys(updateData).length === 0) return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("sites")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    console.error("PATCH /api/sites/[id] update failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, site: serializeSite(data ?? undefined) });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forbid = await ensureSiteAccess(id);
  if (forbid) return forbid;

  const { data, error } = await supabaseAdmin.from("sites").select("*").eq("id", id).single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serializeSite(data as Record<string, unknown>));
}
