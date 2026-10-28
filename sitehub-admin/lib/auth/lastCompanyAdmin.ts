import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isCompanySuperAdmin } from "@/lib/auth/roles";

function isActiveUserStatus(status: string | null | undefined): boolean {
  const s = String(status ?? "").toLowerCase().trim();
  return s !== "inactive" && s !== "disabled" && s !== "rejected" && s !== "deleted";
}

/** True when this user is the only active Super Admin (`admin`) in their company. */
export async function isLastCompanySuperAdmin(userId: string): Promise<boolean> {
  const { data: target } = await supabaseAdmin
    .from("users")
    .select("id, role, company_id, status")
    .eq("id", userId)
    .maybeSingle();
  if (!target || !isCompanySuperAdmin((target as { role?: string }).role)) return false;
  if (!isActiveUserStatus((target as { status?: string }).status)) return false;

  const companyId = String((target as { company_id?: string | null }).company_id ?? "").trim();
  if (!companyId) return false;

  const { data: peers } = await supabaseAdmin
    .from("users")
    .select("id, role, status")
    .eq("company_id", companyId);

  const admins = (peers ?? []).filter((row) => {
    const r = row as { role?: string; status?: string };
    return isCompanySuperAdmin(r.role) && isActiveUserStatus(r.status);
  });
  return admins.length <= 1;
}
