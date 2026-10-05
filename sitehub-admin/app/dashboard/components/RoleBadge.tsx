"use client";

import { roleDisplayName } from "@/lib/auth/roles";

interface RoleBadgeProps {
  role: string | null | undefined;
  className?: string;
}

export default function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  const r = (role ?? "—").toString().trim() || "—";
  const display = r === "—" ? "—" : roleDisplayName(r);

  return (
    <span
      className={`role-badge inline-flex items-center whitespace-nowrap rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-slate-700 dark:text-slate-200 ${className}`.trim()}
      title={display}
    >
      {display}
    </span>
  );
}
