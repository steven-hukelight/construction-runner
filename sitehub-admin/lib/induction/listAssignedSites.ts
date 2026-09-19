import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serializeSites } from "@/app/api/sites/_utils/serializeSite";
import { isValidCompletedSiteInduction } from "@/lib/induction/validSiteInduction";

export async function listAssignedSitesForUser(
  userId: string,
  opts?: { companyId?: string | null },
) {
  const uid = String(userId ?? "").trim();
  if (!uid) return [];

  const { data: rows, error } = await supabaseAdmin
    .from("assigned_operatives")
    .select("site_id")
    .eq("user_id", uid);
  if (error) {
    console.error("[assigned-sites] assigned_operatives query failed", error);
    return [];
  }

  const siteIds = [
    ...new Set(
      (rows ?? [])
        .map((r) => String((r as { site_id?: string }).site_id ?? "").trim())
        .filter(Boolean),
    ),
  ];
  if (siteIds.length === 0) return [];

  let query = supabaseAdmin.from("sites").select("*").in("id", siteIds);
  const companyId = (opts?.companyId ?? "").trim();
  if (companyId) query = query.eq("company_id", companyId);

  const { data, error: siteErr } = await query
    .order("created_at", { ascending: false })
    .limit(500);
  if (siteErr) {
    console.error("[assigned-sites] sites query failed", siteErr);
    return [];
  }

  const { data: inductions } = await supabaseAdmin
    .from("user_site_inductions")
    .select("site_id, status, completed_at")
    .eq("user_id", uid)
    .in("site_id", siteIds);
  const bySite = new Map(
    (inductions ?? []).map((row) => [String((row as { site_id?: string }).site_id ?? ""), row]),
  );

  return serializeSites(data ?? []).map((site) => {
    const row = site as Record<string, unknown>;
    const id = String(row.id ?? "");
    const induction = bySite.get(id);
    const completed = induction ? isValidCompletedSiteInduction(induction) : false;
    const status = completed
      ? "completed"
      : String((induction as { status?: string } | undefined)?.status ?? "not_started");
    return {
      ...row,
      inductionStatus: status,
      inductionCompleted: completed,
    };
  });
}

export async function userIsAssignedToSite(userId: string, siteId: string): Promise<boolean> {
  const uid = String(userId ?? "").trim();
  const sid = String(siteId ?? "").trim();
  if (!uid || !sid) return false;
  const { data } = await supabaseAdmin
    .from("assigned_operatives")
    .select("id")
    .eq("user_id", uid)
    .eq("site_id", sid)
    .maybeSingle();
  return !!data;
}
