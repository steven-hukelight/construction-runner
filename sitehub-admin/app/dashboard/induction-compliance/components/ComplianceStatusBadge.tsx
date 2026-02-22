"use client";

import React from "react";
import type { ComplianceFilterStatus } from "../server";

const STATUS_STYLES: Record<ComplianceFilterStatus, { bg: string; text: string }> = {
  compliant: { bg: "bg-emerald-100", text: "text-emerald-800" },
  missing_pre_induction: { bg: "bg-amber-100", text: "text-amber-800" },
  missing_induction: { bg: "bg-gray-100", text: "text-gray-700" },
  expired: { bg: "bg-red-100", text: "text-red-800" },
  override_applied: { bg: "bg-purple-100", text: "text-purple-800" },
  grandfathered: { bg: "bg-blue-100", text: "text-blue-800" },
};

const STATUS_LABELS: Record<ComplianceFilterStatus, string> = {
  compliant: "Compliant",
  missing_pre_induction: "Pre-Induction Required",
  missing_induction: "Induction Required",
  expired: "Expired",
  override_applied: "Override Applied",
  grandfathered: "Grandfathered",
};

type Props = {
  status: ComplianceFilterStatus;
};

export default function ComplianceStatusBadge({ status }: Props) {
  const s = STATUS_STYLES[status] ?? { bg: "bg-gray-100", text: "text-gray-700" };
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md whitespace-nowrap ${s.bg} ${s.text}`}
    >
      {label}
    </span>
  );
}
