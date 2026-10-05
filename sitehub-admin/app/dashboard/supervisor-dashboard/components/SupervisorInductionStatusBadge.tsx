"use client";

import React from "react";
import { toSentenceCase } from "@/lib/utils/sentenceCase";
import type { SupervisorOperativeStatus } from "../utils/buildSupervisorComplianceDataset";
import { preInductionUiEnabled } from "@/lib/featureFlags";

const STATUS_CHIP: Record<SupervisorOperativeStatus, string> = {
  Inducted: "status-chip--ok",
  Grandfathered: "status-chip--info",
  "Pre-Induction Required": "status-chip--warn",
  "Pre-Induction Override": "status-chip--role-superuser",
  "Induction Required": "status-chip--muted",
  Expired: "status-chip--danger",
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
  const chip = STATUS_CHIP[status] ?? "status-chip--muted";
  const label = DISPLAY_LABELS[status] ?? status;
  return <span className={`status-chip ${chip}`}>{toSentenceCase(label)}</span>;
}
