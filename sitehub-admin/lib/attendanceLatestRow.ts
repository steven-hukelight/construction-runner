import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Latest attendance row for a user (all time), same ordering as POST sign-in:
 * created_at DESC (nulls last), then timestamp DESC.
 * Optional company scope: rows for that company OR legacy rows with null company_id.
 */
export async function fetchLatestAttendanceRowForUser(
  selectColumns: string,
  userId: string,
  companyIdForScope?: string | null
): Promise<Record<string, unknown> | null> {
  let q = supabaseAdmin.from("attendance").select(selectColumns).eq("user_id", userId);
  const trimmed =
    companyIdForScope != null && String(companyIdForScope).trim() !== ""
      ? String(companyIdForScope).trim()
      : "";
  if (trimmed) {
    q = q.or(`company_id.eq.${trimmed},company_id.is.null`);
  }
  const { data, error } = await q
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("fetchLatestAttendanceRowForUser:", error.message);
    throw error;
  }
  return data != null ? (data as unknown as Record<string, unknown>) : null;
}
