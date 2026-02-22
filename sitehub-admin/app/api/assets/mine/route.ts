import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** GET /api/assets/mine - Assets assigned to the logged-in operative */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const uid = cookieStore.get("uid")?.value?.trim();
    const userEmail = cookieStore.get("user_email")?.value?.trim();
    if (!uid && !userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId = uid ?? null;
    if (!userId && userEmail) {
      const { data } = await supabaseAdmin.from("users").select("id").eq("email", userEmail).maybeSingle();
      userId = (data as { id?: string } | null)?.id ?? null;
    }
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 401 });

    // asset_assignments may not exist if migrations not run – return [] gracefully
    let assetIds: string[] = [];
    try {
      const { data: assignments } = await supabaseAdmin
        .from("asset_assignments")
        .select("asset_id")
        .eq("user_id", userId);
      assetIds = (assignments ?? []).map((a) => (a as { asset_id: string }).asset_id);
    } catch {
      return NextResponse.json([]);
    }
    if (assetIds.length === 0) return NextResponse.json([]);

    // Select only base columns – category/serial_number/condition may not exist yet
    const { data: assets, error } = await supabaseAdmin
      .from("assets")
      .select("id, name, description, type, status, site_id")
      .in("id", assetIds);

    if (error) {
      console.warn("GET /api/assets/mine assets query:", error.message);
      return NextResponse.json([]);
    }
    return NextResponse.json(assets ?? []);
  } catch (e) {
    console.error("GET /api/assets/mine failed:", e);
    return NextResponse.json([], { status: 200 });
  }
}
