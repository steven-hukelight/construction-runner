import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidCompletedSiteInduction } from "@/lib/induction/validSiteInduction";

export function isActiveUserStatus(status: unknown): boolean {
  const s = String(status ?? "").toLowerCase();
  return s !== "inactive" && s !== "disabled" && s !== "rejected";
}

/**
 * Assigned operatives on a site (or every company site when siteId is empty),
 * limited to active users. Matches briefing/RAMS acknowledgement denominators.
 */
export async function assignedActiveUserIds(
  companyId: string,
  siteId: string | null
): Promise<string[]> {
  const cid = companyId.trim();
  if (!cid) return [];

  const { data: companySites } = await supabaseAdmin.from("sites").select("id").eq("company_id", cid);
  const companySiteIds = (companySites ?? []).map((s) => String(s.id)).filter(Boolean);
  if (companySiteIds.length === 0) return [];

  const sid = (siteId ?? "").trim();
  const siteIds = sid ? companySiteIds.filter((id) => id === sid) : companySiteIds;
  if (siteIds.length === 0) return [];

  const [{ data: assigned }, { data: companyUsers }] = await Promise.all([
    supabaseAdmin.from("assigned_operatives").select("user_id, userid, site_id").in("site_id", siteIds),
    supabaseAdmin.from("users").select("id, status").eq("company_id", cid),
  ]);

  const activeIds = new Set(
    (companyUsers ?? [])
      .filter((u) => isActiveUserStatus((u as { status?: string }).status))
      .map((u) => String((u as { id: string }).id))
  );

  const ids = new Set<string>();
  for (const row of assigned ?? []) {
    const rec = row as { user_id?: string; userid?: string };
    const uid = String(rec.user_id ?? rec.userid ?? "").trim();
    if (uid && activeIds.has(uid)) ids.add(uid);
  }
  return [...ids];
}

export async function inductedUserIdSet(
  userIds: string[],
  siteId: string | null
): Promise<Set<string>> {
  const ids = [...new Set(userIds.map((id) => String(id).trim()).filter(Boolean))];
  if (ids.length === 0) return new Set();

  const sid = (siteId ?? "").trim();
  let query = supabaseAdmin
    .from("user_site_inductions")
    .select("user_id, site_id, status, completed_at")
    .in("user_id", ids);
  if (sid) query = query.eq("site_id", sid);

  const { data, error } = await query;
  if (error) {
    console.warn("[hs-audience] induction lookup failed:", error.message);
    return new Set(ids);
  }

  const inducted = new Set<string>();
  for (const row of data ?? []) {
    const rec = row as {
      user_id?: string;
      status?: string | null;
      completed_at?: string | null;
    };
    if (isValidCompletedSiteInduction(rec) && rec.user_id) inducted.add(String(rec.user_id));
  }
  return inducted;
}
