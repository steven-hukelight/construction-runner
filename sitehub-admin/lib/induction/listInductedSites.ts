import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serializeSites } from "@/app/api/sites/_utils/serializeSite";
import { isValidCompletedSiteInduction } from "@/lib/induction/validSiteInduction";

export async function listInductedSitesForUser(
  userId: string,
  opts?: { companyId?: string | null; restrictToSiteIds?: string[] | null },
) {
  const uid = String(userId ?? "").trim();
  if (!uid) return [];

  const { data: rows, error } = await supabaseAdmin
    .from("user_site_inductions")
    .select("site_id, status, completed_at")
    .eq("user_id", uid);
  if (error) {
    console.error("[inducted-sites] user_site_inductions query failed", error);
    return [];
  }

  let siteIds = [...new Set(
    (rows ?? [])
      .filter((r) => isValidCompletedSiteInduction(r))
      .map((r) => String((r as { site_id?: string }).site_id ?? "").trim())
      .filter(Boolean),
  )];

  const restrict = opts?.restrictToSiteIds;
  if (restrict) {
    const allowed = new Set(restrict);
    siteIds = siteIds.filter((id) => allowed.has(id));
  }
  if (siteIds.length === 0) return [];

  let query = supabaseAdmin.from("sites").select("*").in("id", siteIds);
  const companyId = (opts?.companyId ?? "").trim();
  if (companyId) query = query.eq("company_id", companyId);

  const { data, error: siteErr } = await query
    .order("created_at", { ascending: false })
    .limit(500);
  if (siteErr) {
    console.error("[inducted-sites] sites query failed", siteErr);
    return [];
  }
  return serializeSites(data ?? []);
}

export async function userHasValidSiteInduction(
  userId: string,
  siteId: string,
): Promise<boolean> {
  const uid = String(userId ?? "").trim();
  const sid = String(siteId ?? "").trim();
  if (!uid || !sid) return false;
  const { data } = await supabaseAdmin
    .from("user_site_inductions")
    .select("status, completed_at")
    .eq("user_id", uid)
    .eq("site_id", sid)
    .maybeSingle();
  if (!data) return false;
  return isValidCompletedSiteInduction(data);
}
