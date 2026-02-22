/**
 * RAMS compliance logic and status computation.
 * Used across Pre-Induction, Induction, Supervisor, Subcontractor, Compliance.
 */

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RamsStatus = "not_required" | "pending" | "accepted" | "outdated";

export interface RamsTrainingData {
  ramsAccepted?: boolean;
  ramsAcceptedAt?: unknown;
  ramsVersion?: string | null;
  ramsRequiredVersion?: string | null;
  ramsRequiredVersionBySite?: Record<string, string>;
  ramsStatus?: RamsStatus;
}

export interface RamsCheckParams {
  training: RamsTrainingData | null | undefined;
  siteRamsVersion: string | null;
  siteHasRams: boolean;
}

/**
 * Compute RAMS status for an operative on a specific site.
 */
export function computeRamsStatus(params: RamsCheckParams): RamsStatus {
  const { training, siteRamsVersion, siteHasRams } = params;

  if (!siteHasRams || !siteRamsVersion) return "not_required";

  const required = siteRamsVersion;
  const accepted = training?.ramsAccepted === true;
  const acceptedVersion = training?.ramsVersion ?? null;

  if (!accepted) return "pending";
  if (acceptedVersion !== required) return "outdated";
  return "accepted";
}

/**
 * Get RAMS status for a specific site.
 */
export function getRamsStatusForSite(
  training: RamsTrainingData | null | undefined,
  siteId: string,
  siteRamsVersion: string | null
): RamsStatus {
  const siteHasRams = !!siteRamsVersion;
  return computeRamsStatus({ training, siteRamsVersion, siteHasRams });
}

/**
 * Check if operative is RAMS compliant for a site.
 */
export function isRamsCompliant(
  params: RamsCheckParams,
  overrides?: { adminPreInductionOverride?: boolean; grandfathered?: boolean }
): boolean {
  const status = computeRamsStatus(params);
  if (status === "not_required") return true;
  if (status === "accepted") return true;
  if (overrides?.adminPreInductionOverride) return true;
  if (overrides?.grandfathered) return true;
  return false;
}

/**
 * Called when RAMS is approved for a site.
 * Increments site rams_version, updates rams_updated_at, and sets assigned operatives'
 * pre_induction_training rams_required_version_by_site and rams_status.
 */
export async function onRamsApprovedForSite(_db: SupabaseClient | unknown, siteId: string): Promise<void> {
  const supabase = supabaseAdmin;
  const { data: siteRow } = await supabase.from("sites").select("rams_version, ramsversion").eq("id", siteId).single();
  if (!siteRow) return;

  const currentVersion = (siteRow.rams_version ?? siteRow.ramsversion ?? "0") as string;
  const nextNum = parseInt(currentVersion, 10) + 1;
  const newVersion = String(nextNum);

  await supabase.from("sites").update({
    rams_version: newVersion,
    rams_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", siteId);

  const { data: assigned } = await supabase
    .from("assigned_operatives")
    .select("user_id, userid")
    .or(`site_id.eq.${siteId},siteid.eq.${siteId}`);

  const operativeIds = (assigned ?? []).map((a) => a.user_id ?? a.userid).filter(Boolean);
  for (const operativeId of operativeIds) {
    const { data: training } = await supabase
      .from("pre_induction_training")
      .select("training_records, rams_required_version_by_site")
      .eq("user_id", operativeId)
      .maybeSingle();

    const bySite = (training?.rams_required_version_by_site ?? {}) as Record<string, string>;
    bySite[siteId] = newVersion;

    await supabase
      .from("pre_induction_training")
      .upsert({
        user_id: operativeId,
        rams_required_version_by_site: bySite,
        rams_required_version: newVersion,
        rams_status: "outdated",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
  }
}
