"use client";

import { roleDisplayName } from "@/lib/auth/roles";
import { roleChipClass } from "@/lib/ui/roleStyles";

interface RoleBadgeProps {
  role: string | null | undefined;
  className?: string;
}

export default function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  const r = (role ?? "—").toString().trim() || "—";
  const display = r === "—" ? "—" : roleDisplayName(r);
  const known = display !== "—";

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${known ? roleChipClass(r) : "bg-slate-100 text-slate-700"} ${className}`.trim()}
      title={display}
    >
      {known ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden /> : null}
      {display}
    </span>
  );
}
