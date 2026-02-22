"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type InductionRow = {
  siteId: string;
  siteName: string;
  status: "completed" | "not_started" | "expired";
  completedAt: Date | null;
};

export type InductionData = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    companyId: string | null;
    companyName: string | null;
    role: string | null;
  } | null;
  rows: InductionRow[];
  summary: {
    totalSitesInducted: number;
    lastInductionDate: Date | null;
    activeCount: number;
    expiredCount: number;
  };
};

const EXPIRY_DAYS = 365;

export async function getInductionData(
  userId: string,
  auth: { role: string | undefined; companyId: string | undefined }
): Promise<InductionData> {
  const empty: InductionData = {
    user: null,
    rows: [],
    summary: { totalSitesInducted: 0, lastInductionDate: null, activeCount: 0, expiredCount: 0 },
  };

  const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", userId).maybeSingle();
  if (!user) return empty;

  const userCompanyId = (user.company_id ?? "") as string;
  if (auth.role !== "superuser" && auth.companyId !== userCompanyId) return empty;

  let companyName: string | null = null;
  if (userCompanyId) {
    const { data: company } = await supabaseAdmin.from("companies").select("name").eq("id", userCompanyId).maybeSingle();
    companyName = company?.name ?? null;
  }

  const { data: inductions } = await supabaseAdmin
    .from("user_site_inductions")
    .select("site_id, status, completed_at")
    .eq("user_id", userId);
  const siteIds = (inductions ?? []).map((i) => i.site_id);
  const { data: sites } = siteIds.length ? await supabaseAdmin.from("sites").select("id, name").in("id", siteIds) : { data: [] };
  const siteNames = Object.fromEntries((sites ?? []).map((s) => [s.id, s.name ?? s.id]));

  const now = new Date();
  const rows: InductionRow[] = [];
  let lastInductionDate: Date | null = null;
  let activeCount = 0;
  let expiredCount = 0;

  for (const ind of inductions ?? []) {
    const completedAt = ind.completed_at ? new Date(ind.completed_at) : null;
    const statusVal = (ind.status ?? "completed") as string;
    const isExpired = completedAt && now.getTime() - completedAt.getTime() > EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    const status: InductionRow["status"] = isExpired ? "expired" : statusVal === "completed" ? "completed" : "not_started";
    if (status === "expired") expiredCount++;
    else if (status === "completed") activeCount++;
    if (completedAt && (!lastInductionDate || completedAt > lastInductionDate)) lastInductionDate = completedAt;
    rows.push({
      siteId: ind.site_id,
      siteName: siteNames[ind.site_id] ?? ind.site_id,
      status,
      completedAt,
    });
  }

  return {
    user: {
      id: user.id,
      name: (user.display_name ?? null) as string | null,
      email: (user.email ?? null) as string | null,
      companyId: userCompanyId || null,
      companyName,
      role: (user.role ?? null) as string | null,
    },
    rows,
    summary: {
      totalSitesInducted: rows.filter((r) => r.status === "completed" || r.status === "expired").length,
      lastInductionDate,
      activeCount,
      expiredCount,
    },
  };
}
