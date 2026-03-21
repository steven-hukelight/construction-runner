"use client";

import type { RamsStatus } from "@/lib/ramsCompliance";

const STYLES: Record<RamsStatus, { bg: string; text: string; label: string }> = {
  accepted: { bg: "bg-green-100 dark:bg-green-900/50", text: "text-green-800 dark:text-green-300", label: "Accepted" },
  pending: { bg: "bg-amber-100 dark:bg-amber-900/50", text: "text-amber-800 dark:text-amber-300", label: "Pending" },
  outdated: { bg: "bg-red-100 dark:bg-red-900/50", text: "text-red-800 dark:text-red-300", label: "Outdated" },
  not_required: { bg: "bg-gray-100 dark:bg-slate-700", text: "text-gray-700 dark:text-slate-300", label: "Not Required" },
};

type Props = {
  status: RamsStatus;
  className?: string;
};

export default function RAMSStatusBadge({ status, className = "" }: Props) {
  const style = STYLES[status] ?? STYLES.not_required;
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text} ${className}`}
      title={status}
    >
      {style.label}
    </span>
  );
}
