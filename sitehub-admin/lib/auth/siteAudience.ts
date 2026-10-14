import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeRole } from "@/lib/auth/roles";

/** Everyone in the company. Used when an item is marked site-wide. */
export async function userIdsForCompany(companyId: string): Promise<string[]> {
  if (!companyId) return [];
  const { data } = await supabaseAdmin.from("users").select("id").eq("company_id", companyId);
  return (data ?? []).map((row) => String((row as { id: string }).id));
}

/** People who should be notified about content on one site (not the whole company). */
export async function userIdsForSiteContent(companyId: string, siteId: string): Promise<string[]> {
  const ids = new Set<string>();
  if (!companyId || !siteId) return [];

  const { data: staff } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("company_id", companyId);
  for (const u of staff ?? []) {
    const role = normalizeRole((u as { role?: string }).role);
    // Company-wide staff who should hear about site H&S content.
    if (
      role === "admin" ||
      role === "superuser" ||
      role === "supervisor" ||
      role === "site_admin" ||
      role === "sub_admin"
    ) {
      ids.add(String((u as { id: string }).id));
    }
  }

  const { data: siteUsers } = await supabaseAdmin
    .from("user_sites")
    .select("user_id")
    .eq("site_id", siteId);
  for (const row of siteUsers ?? []) {
    if (row.user_id) ids.add(String(row.user_id));
  }

  const { data: assigned } = await supabaseAdmin
    .from("assigned_operatives")
    .select("user_id")
    .eq("site_id", siteId);
  for (const row of assigned ?? []) {
    if (row.user_id) ids.add(String(row.user_id));
  }

  return [...ids];
}
