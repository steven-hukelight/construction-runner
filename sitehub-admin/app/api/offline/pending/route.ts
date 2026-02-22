import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

/**
 * GET /api/offline/pending
 * Return unsynced items (synced_at IS NULL) for company.
 * Admin/supervisor only. Filter by companyId from cookie.
 */
export async function GET(_req: Request) {
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
      return NextResponse.json({ error: "companyId required" }, { status: 400 });
    }

    let query = supabaseAdmin
      .from("offline_queue")
      .select("id, user_id, company_id, type, payload, created_at")
      .is("synced_at", null)
      .order("created_at", { ascending: true });

    if (companyId && role !== "superuser") {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET /api/offline/pending failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("GET /api/offline/pending failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
