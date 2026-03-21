import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const email = cookieStore.get("user_email")?.value;
    const role = cookieStore.get("role")?.value;
    if (!email || !role) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: users } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (!users || users.length === 0) {
      return NextResponse.json({ email, company_id: null, companyId: null, companyName: null });
    }

    const userData = users[0];
    const roleLower = (role ?? "").toLowerCase();
    // Superuser impersonating: use companyId from cookie (web) or mobile sends selected company via X-Company-Id header
    const impersonating = cookieStore.get("impersonating")?.value === "true";
    const cookieCompanyId = cookieStore.get("companyId")?.value?.trim();
    let companyId = userData.company_id ?? userData.companyId ?? null;
    if (roleLower === "superuser") {
      if (impersonating && cookieCompanyId) companyId = cookieCompanyId;
      // Mobile superuser: no company until they select one; backend allows null for superuser
    }
    const userId = userData.id;
    const preInductionStatus = (userData.pre_induction_status ?? "not_started") as string;
    const adminPreInductionOverride = userData.admin_pre_induction_override === true;

    const { data: personal } = await supabaseAdmin
      .from("pre_induction_personal")
      .select("full_name, data")
      .eq("user_id", userId)
      .maybeSingle();
    const pr = personal as { full_name?: string | null; data?: Record<string, unknown> } | null;
    const d = pr?.data ?? {};
    const resolvedName = (pr?.full_name ?? d?.full_name ?? d?.fullName ?? userData.display_name ?? userData.name ?? userData.displayName ?? email?.split("@")[0] ?? null) as string | null;

    let companyName: string | null = null;
    if (companyId) {
      const { data: company } = await supabaseAdmin.from("companies").select("name").eq("id", companyId).single();
      companyName = company?.name ?? null;
    }

    return NextResponse.json({
      id: userId,
      email,
      name: resolvedName,
      role: userData.role ?? null,
      company_id: companyId,
      companyId, // legacy alias
      companyName,
      preInductionStatus,
      adminPreInductionOverride,
    });
  } catch (e) {
    console.error("GET /api/me failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
