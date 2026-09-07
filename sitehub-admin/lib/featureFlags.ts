/**
 * Central feature flags for the web admin UI.
 *
 * These are lightweight compile-time booleans (with optional env overrides for
 * previewing behind a flag). They only affect **what the UI renders** — all
 * backing APIs, DB rows, RLS, and enforcement logic stay intact so the feature
 * can be re-enabled by flipping the flag.
 */

/** Server-side truthy check for env values ("true"/"1"/"yes"). */
function envTrue(name: string): boolean {
  const v = process.env[name];
  if (v == null) return false;
  const s = v.trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

/**
 * Whether Pre-Induction UI (Profile pages, nav entries, compliance rows,
 * override toggles, etc.) is surfaced to users.
 *
 * Default: **disabled**. Set `NEXT_PUBLIC_PRE_INDUCTION_UI_ENABLED=true` in
 * environment to bring it back without a code change; otherwise flip this
 * constant.
 *
 * NOTE: This does NOT disable the underlying backend, RLS, storage bucket,
 * cron, or API routes — those keep running so we can re-enable the UI later.
 */
export const preInductionUiEnabled: boolean =
  envTrue("NEXT_PUBLIC_PRE_INDUCTION_UI_ENABLED");
