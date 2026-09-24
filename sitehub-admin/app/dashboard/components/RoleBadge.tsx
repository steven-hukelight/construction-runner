"use client";

import { roleDisplayName } from "@/lib/auth/roles";

const ROLE_CHIP: Record<string, string> = {
  superuser: "status-chip--role-superuser",
  admin: "status-chip--role-admin",
  site_admin: "status-chip--role-site-admin",
  sub_admin: "status-chip--role-sub-admin",
  supervisor: "status-chip--role-supervisor",
  operative: "status-chip--role-operative",
  viewer: "status-chip--muted",
};

interface RoleBadgeProps {
  role: string | null | undefined;
  className?: string;
}

export default function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  const r = (role ?? "—").toString().trim() || "—";
  const display = r === "—" ? "—" : roleDisplayName(r);
  const roleKey = r === "—" ? "" : r.toLowerCase();
  const chip = ROLE_CHIP[roleKey] ?? "status-chip--role-default";

  return (
    <span className={`status-chip ${chip} ${className}`.trim()} title={display}>
      {display}
    </span>
  );
}
