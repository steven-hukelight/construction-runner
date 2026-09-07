/**
 * POST /api/induction/complete
 * Marks a site induction as completed for the current user.
 * Used by mobile app when operative completes the induction checklist.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const uid = cookieStore.get("uid")?.value;
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();

    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = (body.userId ?? body.user_id)?.toString()?.trim();
    const siteId = (body.siteId ?? body.site_id)?.toString()?.trim();

    if (!userId || !siteId) {
      return NextResponse.json(
        { error: "userId and siteId required" },
        { status: 400 }
      );
    }

    // User can complete their own induction; admin/supervisor can complete for operatives
    const isSelf = userId === uid;
    const isAdmin = role === "superuser" || role === "admin" || role === "supervisor";

    if (!isSelf && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from("user_site_inductions").upsert(
      {
        user_id: userId,
        site_id: siteId,
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,site_id" }
    );

    if (error) {
      console.error("Induction complete failed:", error);
      return NextResponse.json({ error: "Failed to complete induction" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/induction/complete:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
