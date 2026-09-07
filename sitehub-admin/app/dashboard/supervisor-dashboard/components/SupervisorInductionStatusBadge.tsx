"use client";

import React from "react";
import type { SupervisorOperativeStatus } from "../utils/buildSupervisorComplianceDataset";
import { preInductionUiEnabled } from "@/lib/featureFlags";

const STATUS_STYLES: Record<SupervisorOperativeStatus, { bg: string; text: string }> = {
  Inducted: { bg: "bg-emerald-100", text: "text-emerald-800" },
  Grandfathered: { bg: "bg-blue-100", text: "text-blue-800" },
  "Pre-Induction Required": { bg: "bg-amber-100", text: "text-amber-800" },
  "Pre-Induction Override": { bg: "bg-purple-100", text: "text-purple-800" },
  "Induction Required": { bg: "bg-gray-100", text: "text-gray-700" },
  Expired: { bg: "bg-red-100", text: "text-red-800" },
};

// When the pre-induction UI is disabled site-wide we still receive the
// "Pre-Induction *" status values from the compliance builder, but we
// present them with neutral labels so users don't see the feature name.
const DISPLAY_LABELS: Record<SupervisorOperativeStatus, string> = preInductionUiEnabled
  ? {
      Inducted: "Inducted",
      Grandfathered: "Grandfathered",
      "Pre-Induction Required": "Pre-Induction Required",
      "Pre-Induction Override": "Override Applied",
      "Induction Required": "Ready for Induction",
      Expired: "Not Inducted",
    }
  : {
      Inducted: "Inducted",
      Grandfathered: "Grandfathered",
      "Pre-Induction Required": "Induction Required",
      "Pre-Induction Override": "Override Applied",
      "Induction Required": "Ready for Induction",
      Expired: "Not Inducted",
    };

type Props = {
  status: SupervisorOperativeStatus;
};

export default function SupervisorInductionStatusBadge({ status }: Props) {
  const s = STATUS_STYLES[status] ?? { bg: "bg-gray-100", text: "text-gray-700" };
  const label = DISPLAY_LABELS[status] ?? status;
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md whitespace-nowrap ${s.bg} ${s.text}`}
    >
      {label}
    </span>
  );
}
