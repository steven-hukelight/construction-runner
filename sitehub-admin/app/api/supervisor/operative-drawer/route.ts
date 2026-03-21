import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getRamsStatusForSite } from "@/lib/ramsCompliance";

export const dynamic = "force-dynamic";
const EXPIRY_DAYS = 365;

function cid(x: { company_id?: string | null; main_contractor_id?: string | null }): string | null {
  return (x.main_contractor_id ?? x.company_id ?? null) as string | null;
}

async function canAccessSite(siteId: string, auth: { role?: string; companyId?: string }): Promise<boolean> {
  if (auth.role === "superuser") return true;
  if (!auth.companyId) return false;
  const { data: site } = await supabaseAdmin.from("sites").select("*").eq("id", siteId).maybeSingle();
  if (!site) return false;
  if (cid(site) === auth.companyId) return true;
  const { data: sub } = await supabaseAdmin
    .from("site_subcontractors")
    .select("company_id")
    .eq("site_id", siteId)
    .eq("company_id", auth.companyId)
    .maybeSingle();
  return !!sub;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const siteId = url.searchParams.get("siteId");
    if (!userId || !siteId) return NextResponse.json({ error: "userId and siteId required" }, { status: 400 });

    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    let companyId = cookieStore.get("companyId")?.value;
    if (!companyId && role !== "superuser") {
      companyId =
        (await import("@/lib/auth/companyId").then((m) =>
          m.resolveCompanyId({
            cookieCompanyId: cookieStore.get("companyId")?.value,
            userEmail: cookieStore.get("user_email")?.value,
            role,
          })
        )) || undefined;
    }
    if (!(await canAccessSite(siteId, { role, companyId }))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: assigned } = await supabaseAdmin
      .from("assigned_operatives")
      .select("user_id")
      .eq("site_id", siteId);
    const isAssigned = (assigned ?? []).some((a) => a.user_id === userId);
    if (!isAssigned) return NextResponse.json({ error: "Operative not assigned to this site" }, { status: 404 });

    const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", userId).maybeSingle();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const userCompanyId = (user.company_id ?? "") as string;
    let companyName: string | null = null;
    if (userCompanyId) {
      const { data: company } = await supabaseAdmin.from("companies").select("name").eq("id", userCompanyId).maybeSingle();
      companyName = company?.name ?? null;
    }

    const now = new Date();
    const [p, r, c, m, t, d] = await Promise.all([
      supabaseAdmin.from("pre_induction_personal").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_right_to_work").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_certifications").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_medical").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_training").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_declarations").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    const pickData = (row: { data?: unknown } | null) => (row?.data != null ? row.data : row);
    const sectionData = [pickData(p), pickData(r), pickData(c), pickData(m), pickData(t), pickData(d)];
    const sectionKeys = ["personal", "rightToWork", "certifications", "medical", "training", "declarations"];
    const sections: Record<string, unknown> = {};
    sectionKeys.forEach((id, i) => {
      let val: unknown = sectionData[i];
      if (id === "training" && val && typeof val === "object") {
        const row = val as Record<string, unknown>;
        val = {
          ramsVersion: row.rams_version ?? row.ramsVersion,
          ramsAccepted: row.rams_accepted ?? row.ramsAccepted,
          ramsAcceptedAt: row.rams_accepted_at ?? row.ramsAcceptedAt,
          ramsRequiredVersionBySite: row.rams_required_version_by_site ?? row.ramsRequiredVersionBySite,
        } as Record<string, unknown>;
      }
      if (val && typeof val === "object") {
        const filtered = { ...(val as Record<string, unknown>) };
        delete filtered.nationalInsurance;
        delete filtered.niNumber;
        delete filtered.medicalNotes;
        sections[id] = filtered;
      } else {
        sections[id] = null;
      }
    });

    const { data: inductions } = await supabaseAdmin
      .from("user_site_inductions")
      .select("site_id, status, completed_at, grandfathered")
      .eq("user_id", userId);
    const siteIds = (inductions ?? []).map((i) => i.site_id);
    const { data: siteRows } = siteIds.length
      ? await supabaseAdmin.from("sites").select("id, name").in("id", siteIds)
      : { data: [] };
    const siteNames: Record<string, string> = Object.fromEntries((siteRows ?? []).map((s) => [s.id, s.name ?? s.id]));

    const toDate = (v: unknown): Date | null => {
      if (!v) return null;
      if (v instanceof Date) return v;
      if (typeof (v as { toDate?: () => Date }).toDate === "function") return (v as { toDate: () => Date }).toDate();
      const d = new Date(v as string);
      return isNaN(d.getTime()) ? null : d;
    };

    const inductionHistory = (inductions ?? []).map((ind) => {
      const completedAt = toDate(ind.completed_at);
      const grandfathered = ind.grandfathered === true;
      const statusVal = (ind.status ?? "completed") as string;
      const isExpired = completedAt && now.getTime() - completedAt.getTime() > EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      let status = statusVal === "completed" ? (grandfathered ? "Grandfathered" : "Inducted") : "Induction Required";
      if (isExpired) status = "Expired";
      return {
        siteId: ind.site_id,
        siteName: siteNames[ind.site_id] ?? ind.site_id,
        status,
        completedAt: completedAt?.toISOString() ?? null,
        grandfathered,
      };
    });

    const { data: siteRow } = await supabaseAdmin.from("sites").select("rams_version, ramsversion").eq("id", siteId).single();
    const siteRamsVersion = (siteRow?.rams_version ?? siteRow?.ramsversion ?? null) as string | null;
    const training = sections.training as Record<string, unknown> | null;
    const ramsStatus = getRamsStatusForSite(training, siteId, siteRamsVersion);

    const { data: ramsRows } = await supabaseAdmin.from("rams").select("id, title, url, created_at").eq("site_id", siteId).order("created_at", { ascending: false });
    const approvedRams = (ramsRows ?? []).map((r) => ({ ...r, fileUrl: (r as { file_url?: string }).file_url ?? r.url }));
    const latestRams = approvedRams[0];

    const personalRow = p as { full_name?: string | null } | null;
    return NextResponse.json({
      user: {
        id: userId,
        name: (personalRow?.full_name ?? user.display_name ?? user.email ?? null) as string | null,
        email: (user.email ?? null) as string | null,
        companyName,
        preInductionStatus: (user.pre_induction_status ?? "not_started") as string,
        adminPreInductionOverride: ((user as { admin_pre_induction_override?: boolean }).admin_pre_induction_override ?? false) as boolean,
        complianceScore: (user as { compliance_score?: number }).compliance_score ?? null,
      },
      sections,
      inductionHistory,
      rams: {
        status: ramsStatus,
        currentVersion: siteRamsVersion,
        acceptedVersion: (training?.ramsVersion as string) ?? null,
        acceptedAt: toDate(training?.ramsAcceptedAt)?.toISOString() ?? null,
        fileUrl: latestRams?.fileUrl ?? latestRams?.url ?? null,
        title: latestRams?.title ?? null,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load";
    console.error("GET /api/supervisor/operative-drawer:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
