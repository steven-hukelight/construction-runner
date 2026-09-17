import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { findUserByIdOrEmail } from "@/lib/auth/findUser";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const email = cookieStore.get("user_email")?.value;
    const role = cookieStore.get("role")?.value;
    if (!email || !role) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userData = await findUserByIdOrEmail({
      id: cookieStore.get("uid")?.value,
      email,
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const roleLower = (role ?? "").toLowerCase();
    // Superuser impersonating: use companyId from cookie (web) or mobile sends selected company via X-Company-Id header
    const impersonating = cookieStore.get("impersonating")?.value === "true";
    const cookieCompanyId = cookieStore.get("companyId")?.value?.trim();
    let companyId =
      (userData.company_id as string | null | undefined) ??
      (userData.companyId as string | null | undefined) ??
      null;
    if (roleLower === "superuser") {
      if (impersonating && cookieCompanyId) companyId = cookieCompanyId;
      // Mobile superuser: no company until they select one; backend allows null for superuser
    }
    const userId = String(userData.id ?? "");
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const preInductionStatus = String(userData.pre_induction_status ?? "not_started");
    const adminPreInductionOverride = userData.admin_pre_induction_override === true;

    const { data: personal } = await supabaseAdmin
      .from("pre_induction_personal")
      .select("full_name, data")
      .eq("user_id", userId)
      .maybeSingle();
    const pr = personal as { full_name?: string | null; data?: Record<string, unknown> } | null;
    const d = pr?.data ?? {};
    const resolvedName = (pr?.full_name ??
      d?.full_name ??
      d?.fullName ??
      userData.display_name ??
      userData.name ??
      userData.displayName ??
      email?.split("@")[0] ??
      null) as string | null;
    const jobTitle = (d?.job_title ?? d?.jobTitle ?? d?.jobRole ?? null) as string | null;

    let companyName: string | null = null;
    if (companyId) {
      const { data: company } = await supabaseAdmin.from("companies").select("name").eq("id", companyId).single();
      companyName = company?.name ?? null;
    }

    let profileJobTitle: string | null = null;
    try {
      const { data: profile } = await supabaseAdmin.from("profiles").select("job_title").eq("user_id", userId).maybeSingle();
      profileJobTitle = (profile?.job_title ?? null) as string | null;
    } catch {
      // profiles may not exist
    }

    const sessionStartedRaw = cookieStore.get("session_started_at")?.value;
    const sessionStartedAt = sessionStartedRaw ? parseInt(sessionStartedRaw, 10) : NaN;

    const approved = userData.approved !== false;

    const roleNorm = String(userData.role ?? "").toLowerCase();
    const managerRoles = ["admin", "supervisor", "sub_admin"];
    const prefsRaw = userData.email_notification_preferences as unknown;
    const emailNotificationPreferences =
      managerRoles.includes(roleNorm) && prefsRaw && typeof prefsRaw === "object"
        ? {
            operativePendingApproval:
              (prefsRaw as Record<string, unknown>).operativePendingApproval !== false,
          }
        : managerRoles.includes(roleNorm)
          ? { operativePendingApproval: true }
          : null;

    return NextResponse.json({
      id: userId,
      email,
      name: resolvedName,
      role: userData.role ?? null,
      approved,
      emailNotificationPreferences,
      jobTitle: (jobTitle && String(jobTitle).trim()) || (profileJobTitle && String(profileJobTitle).trim()) || null,
      company_id: companyId,
      companyId, // legacy alias
      companyName,
      preInductionStatus,
      adminPreInductionOverride,
      impersonating,
      sessionStartedAt: Number.isFinite(sessionStartedAt) ? sessionStartedAt : null,
    });
  } catch (e) {
    console.error("GET /api/me failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
