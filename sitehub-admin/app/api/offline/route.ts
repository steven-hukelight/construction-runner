import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/offline
 * Store offline payload. Body: { userId, companyId, type, payload }
 * Validates user from session (uid cookie must match userId).
 * Inserts into offline_queue with synced_at=null.
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const uid = cookieStore.get("uid")?.value?.trim();
    const userEmail = cookieStore.get("user_email")?.value?.trim();

    if (!uid && !userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
    const type = typeof body.type === "string" ? body.type.trim() : "";
    const payload = body.payload ?? {};

    if (!userId || !companyId || !type) {
      return NextResponse.json(
        { error: "userId, companyId, and type are required" },
        { status: 400 }
      );
    }

    // Validate that the session user matches the userId being submitted
    let sessionUserId: string | null = uid || null;
    if (!sessionUserId && userEmail) {
      const { data } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", userEmail)
        .maybeSingle();
      sessionUserId = (data as { id?: string } | null)?.id ?? null;
    }

    if (!sessionUserId || sessionUserId !== userId) {
      return NextResponse.json({ error: "Forbidden: cannot submit for another user" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("offline_queue")
      .insert({
        user_id: userId,
        company_id: companyId,
        type,
        payload: typeof payload === "object" ? payload : {},
        synced_at: null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("POST /api/offline failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data?.id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/offline failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
