"use client";

import React from "react";
import Link from "next/link";
import type { ComplianceFilterStatus } from "../server";

const STATUS_CHIP: Record<ComplianceFilterStatus, string> = {
  compliant: "status-chip--ok",
  missing_pre_induction: "status-chip--warn",
  missing_induction: "status-chip--muted",
  expired: "status-chip--danger",
  override_applied: "status-chip--role-superuser",
  grandfathered: "status-chip--info",
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
  siteId?: string | null;
};

export default function ComplianceStatusBadge({ status, siteId }: Props) {
  const chip = STATUS_CHIP[status] ?? "status-chip--muted";
  const label = STATUS_LABELS[status] ?? status;
  const className = `status-chip ${chip}`;
  if (status === "missing_induction" && siteId) {
    return (
      <Link
        href={`/dashboard/sites/${siteId}/induction`}
        className={`${className} hover:opacity-80 transition-opacity`}
        title="Go to site Induction tab"
      >
        {label}
      </Link>
    );
  }
  return <span className={className}>{label}</span>;
}
