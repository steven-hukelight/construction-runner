import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serializeSites } from "@/app/api/sites/_utils/serializeSite";
import { isValidCompletedSiteInduction } from "@/lib/induction/validSiteInduction";

/** Site ids where the user holds a valid completed induction. */
export async function listInductedSiteIdsForUser(userId: string): Promise<string[]> {
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

  return [...new Set(
    ((rows ?? []) as { site_id?: string | null; status?: string | null; completed_at?: string | null }[])
      .filter((r) => isValidCompletedSiteInduction(r))
      .map((r) => String(r.site_id ?? "").trim())
      .filter(Boolean),
  )];
}

export async function listInductedSitesForUser(
  userId: string,
  opts?: { companyId?: string | null; restrictToSiteIds?: string[] | null },
) {
  let siteIds = await listInductedSiteIdsForUser(userId);

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
