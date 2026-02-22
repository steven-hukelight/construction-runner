"use client";

import SuperuserSelfOverrideBlock from "./SuperuserSelfOverrideBlock";

/**
 * Shows Pre-Induction Self-Override for superuser/admin.
 * Use this on dashboards and profile so they can enable override to use the app without completing pre-induction.
 */
export default function SuperuserSelfOverrideSection({ role }: { role?: string | null }) {
  const canOverride = role === "superuser" || role === "admin" || role === "ADMIN" || role === "sub_admin";
  if (!canOverride) return null;
  return <SuperuserSelfOverrideBlock />;
}
