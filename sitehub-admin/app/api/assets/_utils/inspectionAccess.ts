import type { MobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const STAFF_ROLES = new Set(["superuser", "admin", "supervisor", "sub_admin"]);

export type InspectionAccessResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 | 404; error: string };

/** Resolve app user id from mobile/web session (cookies or Bearer). */
export async function resolveUserIdFromAuth(auth: MobileApiAuth): Promise<string | null> {
  let userId = auth.uid?.trim() || null;
  if (!userId && auth.userEmail) {
    const { data } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", auth.userEmail)
      .maybeSingle();
    userId = (data as { id?: string } | null)?.id ?? null;
  }
  return userId;
}

/**
 * Staff (same company) or assigned operative may read/write inspections for an asset.
 */
export async function assertInspectionAssetAccess(
  auth: MobileApiAuth,
  assetId: string
): Promise<InspectionAccessResult> {
  const userId = await resolveUserIdFromAuth(auth);
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const { data: asset, error } = await supabaseAdmin
    .from("assets")
    .select("id, company_id")
    .eq("id", assetId)
    .maybeSingle();
  if (error || !asset) {
    return { ok: false, status: 404, error: "Asset not found" };
  }

  const assetCompanyId = (asset as { company_id: string }).company_id;
  const roleLower = (auth.role ?? "").toLowerCase();

  if (auth.isSuperuser || roleLower === "superuser") {
    return { ok: true, userId };
  }
  if (STAFF_ROLES.has(roleLower)) {
    if (auth.companyId && auth.companyId === assetCompanyId) {
      return { ok: true, userId };
    }
    return { ok: false, status: 403, error: "Forbidden" };
  }

  // Operatives: any asset in their company; if company is missing on the session, require assignment
  if (roleLower === "operative") {
    if (auth.companyId && auth.companyId === assetCompanyId) {
      return { ok: true, userId };
    }
    const { data: asnOp } = await supabaseAdmin
      .from("asset_assignments")
      .select("id")
      .eq("asset_id", assetId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!asnOp) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    return { ok: true, userId };
  }

  // Other roles: assignment to the asset only
  const { data: asn } = await supabaseAdmin
    .from("asset_assignments")
    .select("id")
    .eq("asset_id", assetId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!asn) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, userId };
}

/** Resolve asset for an inspection row, then reuse [assertInspectionAssetAccess]. */
export async function assertInspectionRecordAccess(
  auth: MobileApiAuth,
  inspectionId: string
): Promise<InspectionAccessResult & { assetId?: string }> {
  const { data: row, error } = await supabaseAdmin
    .from("asset_inspections")
    .select("asset_id")
    .eq("id", inspectionId)
    .maybeSingle();
  if (error || !row) {
    return { ok: false, status: 404, error: "Inspection not found" };
  }
  const assetId = String((row as { asset_id: string }).asset_id);
  const access = await assertInspectionAssetAccess(auth, assetId);
  if (!access.ok) return access;
  return { ok: true, userId: access.userId, assetId };
}
