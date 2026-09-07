import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/** GET /api/rams/acknowledged — RAMS document IDs the current user has acknowledged. */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const uid = cookieStore.get("uid")?.value?.trim();
    if (!uid) return NextResponse.json({ ids: [] });

    const { data } = await supabaseAdmin.from("rams_acknowledgements").select("rams_id").eq("user_id", uid);
    const ids = (data ?? []).map((r) => r.rams_id).filter(Boolean);
    return NextResponse.json({ ids });
  } catch (e) {
    console.error("GET /api/rams/acknowledged failed:", e);
    return NextResponse.json({ ids: [] });
  }
}
