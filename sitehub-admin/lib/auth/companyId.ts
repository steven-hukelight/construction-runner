import { supabaseAdmin } from "@/lib/supabaseAdmin";

function cid(u: { company_id?: string | null }): string {
  return String(u.company_id ?? "").trim();
}

/**
 * Resolve company ID for non-superusers. Uses cookie first;
 * if missing, derives from user's company_id in DB (by user_email).
 * For superusers: if headerOverride is set, returns that (mobile superuser diagnostics override).
 */
export async function resolveCompanyId(params: {
  cookieCompanyId: string | undefined;
  userEmail: string | undefined;
  role: string | undefined;
  headerOverride?: string | null;
  queryCompanyId?: string | null;
}): Promise<string> {
  const { cookieCompanyId, userEmail, role, headerOverride, queryCompanyId } = params;
  const roleLower = (role ?? "").toLowerCase();
  if (roleLower === "superuser") {
    const override = (headerOverride ?? queryCompanyId ?? "").trim();
    if (override) return override;
    // Impersonation / company switch often stores company on cookie only.
    return (cookieCompanyId ?? "").trim();
  }

  let companyId = (cookieCompanyId ?? "").trim();
  if (companyId) return companyId;

  if (userEmail) {
    try {
      const { data } = await supabaseAdmin
        .from("users")
        .select("company_id")
        .eq("email", userEmail.trim())
        .limit(1)
        .maybeSingle();
      if (data) companyId = cid(data as { company_id?: string | null });
    } catch (e) {
      console.error("[resolveCompanyId] users lookup failed (check SUPABASE_* env server-side):", e);
    }
  }
  return companyId;
}
