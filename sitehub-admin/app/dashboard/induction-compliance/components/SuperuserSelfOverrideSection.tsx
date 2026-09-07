"use client";

import SuperuserSelfOverrideBlock from "./SuperuserSelfOverrideBlock";
import { preInductionUiEnabled } from "@/lib/featureFlags";

/**
 * Shows Pre-Induction Self-Override for superuser/admin.
 * Use this on dashboards and profile so they can enable override to use the app without completing pre-induction.
 *
 * Renders nothing when the pre-induction UI is disabled site-wide.
 */
export default function SuperuserSelfOverrideSection({ role }: { role?: string | null }) {
  if (!preInductionUiEnabled) return null;
  const canOverride = role === "superuser" || role === "admin" || role === "ADMIN" || role === "sub_admin";
  if (!canOverride) return null;
  return <SuperuserSelfOverrideBlock />;
}
