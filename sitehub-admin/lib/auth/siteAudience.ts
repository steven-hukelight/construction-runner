import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isOpenSignInAction } from "@/lib/attendanceStatusRow";

/** Open sign-ins are auto-closed after 12 hours, so older rows cannot be open. */
const OPEN_SIGN_IN_LOOKBACK_MS = 36 * 60 * 60 * 1000;

/**
 * Everyone whose latest attendance row is an open sign-in at this site, from any company
 * (subcontractors on site must hear a site alarm too).
 */
export async function userIdsSignedInAtSite(siteId: string): Promise<string[]> {
  const sid = siteId.trim();
  if (!sid) return [];
  const since = new Date(Date.now() - OPEN_SIGN_IN_LOOKBACK_MS).toISOString();
  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select("user_id")
    .eq("site_id", sid)
    .gte("timestamp", since)
    .limit(2000);
  if (error) throw new Error(`userIdsSignedInAtSite: ${error.message}`);
  const candidates = [...new Set((data ?? []).map((r) => String((r as { user_id?: string }).user_id ?? "")).filter(Boolean))];
  const latest = await latestRowsSince(candidates, since);
  return candidates.filter((uid) => {
    const row = latest.get(uid);
    return !!row && isOpenSignInAction(row.action) && String(row.site_id ?? "").trim() === sid;
  });
}

type LatestRow = { user_id: string; action: string | null; site_id: string | null };

/**
 * Newest attendance row per user among rows since `since`. Every candidate has a row in the
 * window, so the newest row in the window is also their newest row overall.
 */
async function latestRowsSince(userIds: string[], since: string): Promise<Map<string, LatestRow>> {
  const latest = new Map<string, LatestRow>();
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += 200) chunks.push(userIds.slice(i, i + 200));
  const results = await Promise.all(
    chunks.map((ids) =>
      supabaseAdmin
        .from("attendance")
        .select("user_id, action, site_id")
        .in("user_id", ids)
        .or(`timestamp.gte.${since},created_at.gte.${since}`)
        .order("created_at", { ascending: false, nullsFirst: false })
        .order("timestamp", { ascending: false })
        .limit(10000),
    ),
  );
  for (const { data, error } of results) {
    if (error) throw new Error(`userIdsSignedInAtSite: ${error.message}`);
    for (const row of (data ?? []) as LatestRow[]) {
      const uid = String(row.user_id ?? "");
      if (uid && !latest.has(uid)) latest.set(uid, row);
    }
  }
  return latest;
}

/**
 * Supervisors and admins responsible for a site: company admins, site admins and
 * supervisors assigned in user_sites, and the site manager. Same company only.
 */
export async function staffIdsForSite(companyId: string, siteId: string): Promise<string[]> {
  const sid = siteId.trim();
  if (!companyId || !sid) return [];
  const ids = new Set<string>();

  const [{ data: admins }, { data: assigned }, { data: site }] = await Promise.all([
    supabaseAdmin.from("users").select("id").eq("company_id", companyId).eq("role", "admin"),
    supabaseAdmin.from("user_sites").select("user_id").eq("site_id", sid),
    supabaseAdmin.from("sites").select("manager_id").eq("id", sid).maybeSingle(),
  ]);
  for (const row of admins ?? []) addId(ids, (row as { id: string }).id);
  const assignedIds = (assigned ?? []).map((r) => String((r as { user_id?: string }).user_id ?? "")).filter(Boolean);

  const managerId = String((site as { manager_id?: string | null } | null)?.manager_id ?? "").trim();

  const toCheck = [...new Set([...assignedIds, ...(managerId ? [managerId] : [])])];
  if (toCheck.length) {
    const { data: people } = await supabaseAdmin.from("users").select("id, role, company_id").in("id", toCheck);
    for (const row of people ?? []) {
      const person = row as { id: string; role?: string | null; company_id?: string | null };
      if (String(person.company_id ?? "") !== companyId) continue;
      const role = (person.role ?? "").toLowerCase();
      if (person.id === managerId || role === "site_admin" || role === "supervisor" || role === "admin") {
        addId(ids, person.id);
      }
    }
  }
  return [...ids];
}

/** Everyone in the company. Used when an item is marked site-wide. */
export async function userIdsForCompany(companyId: string): Promise<string[]> {
  if (!companyId) return [];
  const { data } = await supabaseAdmin.from("users").select("id").eq("company_id", companyId);
  return (data ?? []).map((row) => String((row as { id: string }).id));
}

function addId(ids: Set<string>, value: unknown) {
  const id = String(value ?? "").trim();
  if (id) ids.add(id);
}

/**
 * People linked to one site: assigned operatives, site membership, induction,
 * and the site manager. Company-wide staff are not included unless they are
 * on this site.
 */
export async function userIdsForSiteContent(companyId: string, siteId: string): Promise<string[]> {
  const ids = new Set<string>();
  const sid = siteId.trim();
  if (!sid) return [];

  const [{ data: siteUsers }, { data: assigned }, { data: inducted }, { data: site }] = await Promise.all([
    supabaseAdmin.from("user_sites").select("user_id").eq("site_id", sid),
    supabaseAdmin.from("assigned_operatives").select("user_id, userid").eq("site_id", sid),
    supabaseAdmin.from("user_site_inductions").select("user_id").eq("site_id", sid),
    supabaseAdmin.from("sites").select("manager_id").eq("id", sid).maybeSingle(),
  ]);
  for (const row of siteUsers ?? []) addId(ids, (row as { user_id?: string }).user_id);
  for (const row of assigned ?? []) {
    const record = row as { user_id?: string; userid?: string };
    addId(ids, record.user_id);
    addId(ids, record.userid);
  }
  for (const row of inducted ?? []) addId(ids, (row as { user_id?: string }).user_id);
  addId(ids, (site as { manager_id?: string } | null)?.manager_id);

  if (companyId && ids.size > 0) {
    const { data: members } = await supabaseAdmin
      .from("users")
      .select("id, company_id")
      .in("id", [...ids]);
    const otherCompany = new Set(
      (members ?? [])
        .filter((row) => {
          const company = String((row as { company_id?: string }).company_id ?? "").trim();
          return company.length > 0 && company !== companyId;
        })
        .map((row) => String((row as { id: string }).id)),
    );
    for (const id of otherCompany) ids.delete(id);
  }

  return [...ids];
}
