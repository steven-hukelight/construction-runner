import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Only an explicit true turns geofence auto sign-out on. Missing or failed lookups stay off. */
export function autoSignOutEnabledFromRow(value: unknown): boolean {
  return value === true;
}

export async function companyAutoSignOutEnabled(companyId: string | null | undefined): Promise<boolean> {
  const id = companyId?.trim() ?? "";
  if (!id) return false;
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("auto_sign_out_enabled")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return false;
  return autoSignOutEnabledFromRow(
    (data as { auto_sign_out_enabled?: unknown }).auto_sign_out_enabled
  );
}
