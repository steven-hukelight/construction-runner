import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";

export const dynamic = "force-dynamic";

/** GET /api/rams/acknowledged — RAMS document IDs the current user has acknowledged. */
export async function GET(req: Request) {
  try {
    const auth = await resolveMobileApiAuth(req);
    const uid = auth.uid?.trim();
    if (!uid) return NextResponse.json({ ids: [] });

    const { data } = await supabaseAdmin.from("rams_acknowledgements").select("rams_id").eq("user_id", uid);
    const ids = (data ?? []).map((r) => r.rams_id).filter(Boolean);
    return NextResponse.json({ ids });
  } catch (e) {
    console.error("GET /api/rams/acknowledged failed:", e);
    return NextResponse.json({ ids: [] });
  }
}
