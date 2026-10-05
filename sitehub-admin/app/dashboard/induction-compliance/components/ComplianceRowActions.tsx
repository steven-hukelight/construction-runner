"use client";

import React from "react";
import { Eye, MapPin, RotateCcw, FileQuestion, Shield, Trash2, Upload, CheckCircle, Check } from "lucide-react";
import type { ComplianceRow } from "../server";
import TableActions, { type TableActionItem } from "../../components/ui/TableActions";

type Props = {
  row: ComplianceRow;
  isSubcontractorAdmin: boolean;
  onViewDetails: (userId: string) => void;
  onAssignToSite?: (userId: string, siteId: string, companyId: string) => void;
  onMarkInducted?: (userId: string, siteId: string) => void;
  onResetInduction?: (userId: string, siteId: string) => void;
  onRequestDocuments?: (userId: string) => void;
  onApplyOverride?: (userId: string) => void;
  onRemoveFromSite?: (userId: string, siteId: string) => void;
};

export default function ComplianceRowActions({
  row,
  isSubcontractorAdmin,
  onViewDetails,
  onAssignToSite,
  onMarkInducted,
  onResetInduction,
  onRequestDocuments,
  onApplyOverride,
  onRemoveFromSite,
}: Props) {
  const canAssign = row.status === "compliant" || row.status === "grandfathered" || row.status === "override_applied";
  const canMarkInducted = ["missing_induction", "missing_pre_induction", "override_applied"].includes(row.status);

  const items: TableActionItem[] = [
    { label: "View details", icon: Eye, onClick: () => onViewDetails(row.userId) },
    ...(canAssign && onAssignToSite && !isSubcontractorAdmin
      ? [{ label: "Assign to site", icon: MapPin, onClick: () => onAssignToSite(row.userId, row.siteId, row.companyId) }]
      : []),
    ...(canMarkInducted && onMarkInducted && !isSubcontractorAdmin
      ? [{ label: "Mark inducted", icon: Check, onClick: () => onMarkInducted(row.userId, row.siteId) }]
      : []),
    ...(onResetInduction && !isSubcontractorAdmin
      ? [{ label: "Reset induction", icon: RotateCcw, onClick: () => onResetInduction(row.userId, row.siteId) }]
      : []),
    ...(onRequestDocuments
      ? [{ label: "Request documents", icon: FileQuestion, onClick: () => onRequestDocuments(row.userId) }]
      : []),
    ...(onApplyOverride && !isSubcontractorAdmin
      ? [{ label: "Apply override", icon: Shield, onClick: () => onApplyOverride(row.userId) }]
      : []),
    ...(onRemoveFromSite && !isSubcontractorAdmin
      ? [{
          label: "Remove from site",
          icon: Trash2,
          variant: "danger" as const,
          onClick: () => onRemoveFromSite(row.userId, row.siteId),
        }]
      : []),
    ...(isSubcontractorAdmin
      ? [
          { label: "Upload missing documents", icon: Upload, onClick: () => undefined },
          { label: "Request verification", icon: CheckCircle, onClick: () => undefined },
        ]
      : []),
  ];

  return <TableActions items={items} />;
}
