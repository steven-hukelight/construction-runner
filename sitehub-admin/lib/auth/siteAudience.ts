import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentSignedInSiteId } from "@/lib/auth/siteScope";

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
  const checks = await Promise.all(
    candidates.map(async (uid) => ((await currentSignedInSiteId(uid)) === sid ? uid : null)),
  );
  return checks.filter((uid): uid is string => uid !== null);
}

/**
 * Supervisors and admins responsible for a site: company admins, site admins and
 * supervisors assigned in user_sites, and the site manager. Same company only.
 */
export async function staffIdsForSite(companyId: string, siteId: string): Promise<string[]> {
  const sid = siteId.trim();
  if (!companyId || !sid) return [];
  const ids = new Set<string>();

  const { data: admins } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("company_id", companyId)
    .eq("role", "admin");
  for (const row of admins ?? []) addId(ids, (row as { id: string }).id);

  const { data: assigned } = await supabaseAdmin.from("user_sites").select("user_id").eq("site_id", sid);
  const assignedIds = (assigned ?? []).map((r) => String((r as { user_id?: string }).user_id ?? "")).filter(Boolean);

  const { data: site } = await supabaseAdmin.from("sites").select("manager_id").eq("id", sid).maybeSingle();
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

  const { data: siteUsers } = await supabaseAdmin
    .from("user_sites")
    .select("user_id")
    .eq("site_id", sid);
  for (const row of siteUsers ?? []) addId(ids, (row as { user_id?: string }).user_id);

  const { data: assigned } = await supabaseAdmin
    .from("assigned_operatives")
    .select("user_id, userid")
    .eq("site_id", sid);
  for (const row of assigned ?? []) {
    const record = row as { user_id?: string; userid?: string };
    addId(ids, record.user_id);
    addId(ids, record.userid);
  }

  const { data: inducted } = await supabaseAdmin
    .from("user_site_inductions")
    .select("user_id")
    .eq("site_id", sid);
  for (const row of inducted ?? []) addId(ids, (row as { user_id?: string }).user_id);

  const { data: site } = await supabaseAdmin
    .from("sites")
    .select("manager_id")
    .eq("id", sid)
    .maybeSingle();
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
