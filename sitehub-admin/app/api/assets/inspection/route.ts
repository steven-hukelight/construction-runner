import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const uid = cookieStore.get("uid")?.value?.trim();
    const userEmail = cookieStore.get("user_email")?.value?.trim();
    if (!uid && !userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId = uid ?? null;
    if (!userId && userEmail) {
      const { data } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", userEmail)
        .maybeSingle();
      userId = (data as { id?: string } | null)?.id ?? null;
    }
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const assetId = body?.asset_id ?? body?.assetId;
    const notes = body?.notes != null ? String(body.notes).trim() : null;
    const photoUrl = body?.photo_url ?? body?.photoUrl ?? null;
    if (!assetId) return NextResponse.json({ error: "asset_id required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("asset_inspections")
      .insert({ asset_id: assetId, user_id: userId, notes, photo_url: photoUrl })
      .select("id")
      .single();

    if (error) {
      console.error("POST /api/assets/inspection failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id: data?.id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/assets/inspection failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
