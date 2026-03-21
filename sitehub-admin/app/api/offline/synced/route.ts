import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

/**
 * GET /api/offline/synced
 * Return synced items (synced_at IS NOT NULL) for company.
 * Admin/supervisor only.
 */
export async function GET() {
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

    if (!companyId && role !== "superuser") {
      return NextResponse.json([], { status: 200 });
    }

    let query = supabaseAdmin
      .from("offline_queue")
      .select("id, user_id, type, payload, created_at, synced_at")
      .not("synced_at", "is", null)
      .order("synced_at", { ascending: false })
      .limit(100);

    if (companyId && role !== "superuser") {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET /api/offline/synced failed:", error);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("GET /api/offline/synced failed:", e);
    return NextResponse.json([], { status: 200 });
  }
}
