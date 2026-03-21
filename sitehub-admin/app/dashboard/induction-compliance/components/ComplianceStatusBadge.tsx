"use client";

import React from "react";
import type { ComplianceFilterStatus } from "../server";

const STATUS_STYLES: Record<ComplianceFilterStatus, { bg: string; text: string }> = {
  compliant: { bg: "bg-emerald-100 dark:bg-emerald-900/50", text: "text-emerald-800 dark:text-emerald-300" },
  missing_pre_induction: { bg: "bg-amber-100 dark:bg-amber-900/50", text: "text-amber-800 dark:text-amber-300" },
  missing_induction: { bg: "bg-gray-100 dark:bg-slate-700", text: "text-gray-700 dark:text-slate-300" },
  expired: { bg: "bg-red-100 dark:bg-red-900/50", text: "text-red-800 dark:text-red-300" },
  override_applied: { bg: "bg-purple-100 dark:bg-purple-900/50", text: "text-purple-800 dark:text-purple-300" },
  grandfathered: { bg: "bg-blue-100 dark:bg-blue-900/50", text: "text-blue-800 dark:text-blue-300" },
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
  const s = STATUS_STYLES[status] ?? { bg: "bg-gray-100 dark:bg-slate-700", text: "text-gray-700 dark:text-slate-300" };
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md whitespace-nowrap ${s.bg} ${s.text}`}
    >
      {label}
    </span>
  );
}
