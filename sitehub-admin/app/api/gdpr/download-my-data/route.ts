/**
 * GDPR Right to Access - Download My Data
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { writeAuditLog } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const targetUserId = new URL(req.url).searchParams.get("userId");
    const cookieStore = await cookies();
    const email = cookieStore.get("user_email")?.value;
    const role = cookieStore.get("role")?.value;
    const roleLower = (role ?? "").toLowerCase();
    const companyId = cookieStore.get("companyId")?.value;

    if (!email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: me } = await supabaseAdmin.from("users").select("id, email").eq("email", email).limit(1).maybeSingle();
    const actorId = me?.id ?? "unknown";
    const actorEmail = me?.email ?? undefined;

    const userId = targetUserId ?? actorId;
    const isSelf = userId === actorId;

    if (!isSelf) {
      if (roleLower !== "superuser" && roleLower !== "admin" && roleLower !== "sub_admin") {
        return NextResponse.json({ error: "Can only export own data" }, { status: 403 });
      }
      const { data: target } = await supabaseAdmin.from("users").select("id, company_id").eq("id", userId).maybeSingle();
      if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (roleLower !== "superuser" && (target.company_id ?? "") !== (companyId ?? "")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", userId).maybeSingle();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [p, r, c, m, t, d] = await Promise.all([
      supabaseAdmin.from("pre_induction_personal").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_right_to_work").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_certifications").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_medical").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_training").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_declarations").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const pickData = (row: Record<string, unknown> | null) =>
      row ? ((row.data as Record<string, unknown>) ?? row) : null;

    const { data: inductions } = await supabaseAdmin.from("user_site_inductions").select("*").eq("user_id", userId);
    const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("user_id", userId).maybeSingle();

    const exportData = {
      exportedAt: new Date().toISOString(),
      purpose: "GDPR Right to Access - Personal Data Export",
      user: {
        id: user.id,
        email: user.email,
        name: user.display_name,
        role: user.role,
        companyId: user.company_id,
      },
      preInductionProfile: {
        personal: pickData((p as unknown) as Record<string, unknown> | null),
        rightToWork: pickData((r as unknown) as Record<string, unknown> | null),
        certifications: pickData((c as unknown) as Record<string, unknown> | null),
        medical: pickData((m as unknown) as Record<string, unknown> | null),
        training: (t as { data?: unknown })?.data ?? (t as { data?: unknown }) ?? null,
        declarations: pickData((d as unknown) as Record<string, unknown> | null),
      },
      siteInductions: inductions ?? [],
      profile: profile ?? null,
    };

    await writeAuditLog({
      userId,
      action: "gdpr_export",
      timestamp: new Date(),
      actorId,
      actorEmail,
      metadata: { isSelf },
    });

    return NextResponse.json(exportData, {
      headers: { "Content-Disposition": `attachment; filename="my-data-${userId}-${Date.now()}.json"` },
    });
  } catch (e) {
    console.error("GDPR download-my-data:", e);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
