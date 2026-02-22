import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Attendance refresh - Supabase attendance has user_id, site_id, timestamp (no name/siteName). No-op or count only. */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    let role = cookieStore.get("role")?.value;
    let companyId = cookieStore.get("companyId")?.value?.trim() || null;

    try {
      const body = await req.json().catch(() => ({}));
      const bodyCompanyId = typeof body?.companyId === "string" ? body.companyId.trim() : null;
      if (bodyCompanyId && !companyId) companyId = bodyCompanyId;
    } catch {
      /* ignore */
    }

    const email = cookieStore.get("user_email")?.value;
    if (email) {
      const { data: users } = await supabaseAdmin.from("users").select("company_id, role").eq("email", email).limit(1);
      if (users?.length) {
        const u = users[0];
        if (!role) role = u.role ?? undefined;
        if (!companyId && u.company_id) companyId = String(u.company_id).trim() || null;
      }
    }

    const roleLower = (role ?? "").toLowerCase();
    const allowed = roleLower === "superuser" || roleLower === "admin" || roleLower === "supervisor";
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (role !== "superuser" && !companyId) {
      return NextResponse.json({ error: "Company required. Ensure you're assigned to a company." }, { status: 400 });
    }

    const userIds = companyId
      ? (await supabaseAdmin.from("users").select("id").eq("company_id", companyId)).data?.map((u) => u.id) ?? []
      : [];
    const { data: att } =
      role === "superuser"
        ? await supabaseAdmin.from("attendance").select("id")
        : userIds.length
          ? await supabaseAdmin.from("attendance").select("id").in("user_id", userIds)
          : { data: [] };

    const total = (att ?? []).length;
    return NextResponse.json({
      message: `Attendance has ${total} records. Supabase schema uses user_id/site_id (no name/siteName fields to refresh).`,
      total,
      nameUpdated: 0,
      siteUpdated: 0,
    });
  } catch (e: unknown) {
    const err = e as Error;
    console.error("attendance-refresh failed:", err?.message || e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
