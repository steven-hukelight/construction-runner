import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Returns { status, grandfathered } for user's site induction. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const siteId = searchParams.get("siteId");
    if (!userId || !siteId) return NextResponse.json({ error: "userId and siteId required" }, { status: 400 });

    const { data } = await supabaseAdmin
      .from("user_site_inductions")
      .select("status, grandfathered")
      .eq("user_id", userId)
      .eq("site_id", siteId)
      .maybeSingle();

    if (!data) return NextResponse.json({ status: "not_started", grandfathered: false });
    return NextResponse.json({
      status: (data.status as string) ?? "not_started",
      grandfathered: data.grandfathered === true,
    });
  } catch {
    return NextResponse.json({ status: "not_started", grandfathered: false }, { status: 200 });
  }
}
