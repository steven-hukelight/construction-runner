"use client";

import type { RamsStatus } from "@/lib/ramsCompliance";

const STYLES: Record<RamsStatus, { bg: string; text: string; label: string }> = {
  accepted: { bg: "bg-green-100", text: "text-green-800", label: "Accepted" },
  pending: { bg: "bg-amber-100", text: "text-amber-800", label: "Pending" },
  outdated: { bg: "bg-red-100", text: "text-red-800", label: "Outdated" },
  not_required: { bg: "bg-gray-100", text: "text-gray-700", label: "Not Required" },
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
