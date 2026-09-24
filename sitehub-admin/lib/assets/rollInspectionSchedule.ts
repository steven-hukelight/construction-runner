import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  computeNextInspectionDue,
  parseIntervalDays,
} from "@/lib/assets/inspectionSchedule";

/** After a completed inspection, roll last_inspected_at + next_inspection_due. */
export async function rollAssetInspectionSchedule(assetId: string): Promise<void> {
  const { data: asset, error } = await supabaseAdmin
    .from("assets")
    .select("id, inspection_interval_days, inspection_required")
    .eq("id", assetId)
    .maybeSingle();

  if (error || !asset) return;
  const required = (asset as { inspection_required?: boolean }).inspection_required !== false;
  if (!required) return;

  const intervalDays = parseIntervalDays(
    (asset as { inspection_interval_days?: number | null }).inspection_interval_days,
  );
  const now = new Date();
  const nextDue = computeNextInspectionDue({ intervalDays, from: now });

  await supabaseAdmin
    .from("assets")
    .update({
      last_inspected_at: now.toISOString(),
      next_inspection_due: nextDue,
    })
    .eq("id", assetId);
}
