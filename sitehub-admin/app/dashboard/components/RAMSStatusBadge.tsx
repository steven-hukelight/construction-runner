"use client";

import type { RamsStatus } from "@/lib/ramsCompliance";
import { toSentenceCase } from "@/lib/utils/sentenceCase";

const STYLES: Record<RamsStatus, { chip: string; label: string }> = {
  accepted: { chip: "status-chip--ok", label: "Accepted" },
  pending: { chip: "status-chip--warn", label: "Pending" },
  outdated: { chip: "status-chip--danger", label: "Outdated" },
  not_required: { chip: "status-chip--muted", label: "Not Required" },
};

type Props = {
  status: RamsStatus;
  className?: string;
};

export default function RAMSStatusBadge({ status, className = "" }: Props) {
  const style = STYLES[status] ?? STYLES.not_required;
  return (
    <span
      className={`status-chip ${style.chip} ${className}`.trim()}
      title={status}
    >
      {toSentenceCase(style.label)}
    </span>
  );
}
