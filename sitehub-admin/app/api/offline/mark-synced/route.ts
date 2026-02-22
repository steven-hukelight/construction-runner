import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

/**
 * PATCH /api/offline/mark-synced
 * Body: { ids: string[] }. Update synced_at=NOW() for those ids.
 * Admin/supervisor only.
 */
export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    let companyId = cookieStore.get("companyId")?.value?.trim();

    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || undefined;
    }

    const roleLower = (role ?? "").toLowerCase();
    if (roleLower === "operative") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const rawIds = body.ids;
    const ids = Array.isArray(rawIds)
      ? rawIds.map((x) => String(x).trim()).filter(Boolean)
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "ids array required and must not be empty" }, { status: 400 });
    }

    let query = supabaseAdmin
      .from("offline_queue")
      .update({ synced_at: new Date().toISOString() })
      .in("id", ids);

    // Non-superusers can only mark items from their company
    if (companyId && role !== "superuser") {
      query = query.eq("company_id", companyId);
    }

    const { error } = await query;

    if (error) {
      console.error("PATCH /api/offline/mark-synced failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/offline/mark-synced failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
