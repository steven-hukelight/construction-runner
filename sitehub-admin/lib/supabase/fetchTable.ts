/**
 * CURSOR INSTRUCTION:
 * Use this helper for ALL Supabase table queries.
 *
 * It automatically:
 * - bypasses company filtering for superusers
 * - applies company_id filtering for all other roles
 * - orders by created_at DESC
 * - returns consistent data + error objects
 *
 * Usage:
 *   const sites = await fetchTable("sites", role, companyId);
 *   const tasks = await fetchTable("tasks", role, companyId);
 */

import { supabase } from "@/lib/supabaseClient";

export async function fetchTable(
  table: string,
  role: string | undefined,
  companyId: string | null | undefined
) {
  try {
    if (role === "superuser") {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("created_at", { ascending: false });
      return { data, error };
    }

    if (!companyId) {
      return { data: null, error: new Error("companyId required for non-superuser") };
    }

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    return { data, error };
  } catch (error) {
    console.error(`Error fetching ${table}:`, error);
    return { data: null, error };
  }
}
