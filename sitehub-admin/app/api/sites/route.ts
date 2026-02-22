import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";

function cid(x: { company_id?: string | null }): string | null {
  return (x.company_id ?? null) as string | null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    let companyId = (
      await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })
    ).trim() || undefined;
    if (role === "superuser") {
      const all = searchParams.get("all") === "true";
      if (all) {
        const { data } = await supabaseAdmin.from("sites").select("*").order("created_at", { ascending: false });
        return NextResponse.json((data ?? []).map((d) => ({ id: d.id, ...d })));
      }
      companyId = searchParams.get("companyId") || companyId || undefined;
      if (companyId) {
        const { data } = await supabaseAdmin
          .from("sites")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });
        return NextResponse.json((data ?? []).map((d) => ({ id: d.id, ...d })));
      }
      const { data } = await supabaseAdmin.from("sites").select("*").order("created_at", { ascending: false });
      return NextResponse.json((data ?? []).map((d) => ({ id: d.id, ...d })));
    }
    if (companyId) {
      const { data } = await supabaseAdmin
        .from("sites")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      return NextResponse.json((data ?? []).map((d) => ({ id: d.id, ...d })));
    }
    return NextResponse.json([], { status: 200 });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("GET /api/sites failed:", err?.message || e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const lat = body.geofence?.center?.lat ?? body.location?.lat;
  const lng = body.geofence?.center?.lng ?? body.location?.lng;
  const radiusMeters = body.geofence?.radiusMeters;

  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const companyId =
    cookieStore.get("companyId")?.value ||
    (await resolveCompanyId({
      cookieCompanyId: cookieStore.get("companyId")?.value,
      userEmail: cookieStore.get("user_email")?.value,
      role,
    })) ||
    null;
  const assignedCompanyId = role === "superuser" ? (body.companyId ?? companyId ?? null) : (companyId ?? null);
  if (!assignedCompanyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("sites").insert({
    name: body.name,
    location: body.location,
    geofence: body.geofence ?? null,
    latitude: lat ?? null,
    longitude: lng ?? null,
    radius_meters: radiusMeters ?? null,
    show_on_map: body.showOnMap ?? true,
    active: body.active ?? true,
    manager_id: body.managerId ?? null,
    company_id: assignedCompanyId,
  }).select("id").single();

  if (error) {
    console.error("POST /api/sites failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data?.id }, { status: 201 });
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    let companyId = cookieStore.get("companyId")?.value;
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || undefined;
    }
    if (role !== "superuser") {
      if (!companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { data: site } = await supabaseAdmin.from("sites").select("*").eq("id", id).single();
      if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const siteCompanyId = cid(site);
      if (siteCompanyId !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await supabaseAdmin.from("sites").delete().eq("id", id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("DELETE /api/sites failed:", err?.message || e);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
