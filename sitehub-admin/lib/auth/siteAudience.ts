import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
