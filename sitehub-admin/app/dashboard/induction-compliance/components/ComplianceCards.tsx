"use client";

import React from "react";
import type { ComplianceRow } from "../server";
import ComplianceStatusBadge from "./ComplianceStatusBadge";
import ComplianceMissingItemsIcon from "./ComplianceMissingItemsIcon";
import ComplianceExpiryWarnings from "./ComplianceExpiryWarnings";
import ComplianceRowActions from "./ComplianceRowActions";
import RAMSStatusBadge from "../../components/RAMSStatusBadge";

type Props = {
  rows: ComplianceRow[];
  isSubcontractorAdmin: boolean;
  onRowClick: (userId: string) => void;
  onViewDetails: (userId: string) => void;
  onAssignToSite?: (userId: string, siteId: string) => void;
  onResetInduction?: (userId: string, siteId: string) => void;
  onRequestDocuments?: (userId: string) => void;
  onApplyOverride?: (userId: string) => void;
  onRemoveFromSite?: (userId: string, siteId: string) => void;
};

export default function ComplianceCards({
  rows,
  isSubcontractorAdmin,
  onRowClick,
  onViewDetails,
  onAssignToSite,
  onResetInduction,
  onRequestDocuments,
  onApplyOverride,
  onRemoveFromSite,
}: Props) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {rows.map((row, i) => (
        <div
          key={`${row.userId}-${row.siteId}-${i}`}
          onClick={() => onRowClick(row.userId)}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm shrink-0">
                {(row.userName || "?")[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-gray-900 truncate">{row.userName}</div>
                <div className="text-xs text-gray-500">
                  {row.companyName} • {row.siteName}
                  {(row.userRole && row.userRole !== "OPERATIVE") && (
                    <> • <span className="font-medium text-gray-600">{row.userRole}</span></>
                  )}
                </div>
                {row.trade && <div className="text-xs text-gray-600 mt-0.5">{row.trade}</div>}
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <ComplianceRowActions
                row={row}
                isSubcontractorAdmin={isSubcontractorAdmin}
                onViewDetails={onViewDetails}
                onAssignToSite={onAssignToSite}
                onResetInduction={onResetInduction}
                onRequestDocuments={onRequestDocuments}
                onApplyOverride={onApplyOverride}
                onRemoveFromSite={onRemoveFromSite}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ComplianceStatusBadge status={row.status} />
            <RAMSStatusBadge status={row.ramsStatus} />
            {row.adminPreInductionOverride && (
              <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-md bg-purple-100 text-purple-800">
                Override
              </span>
            )}
            <ComplianceMissingItemsIcon items={row.missingItems} />
            <ComplianceExpiryWarnings items={row.expiryWarnings} />
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <div className="col-span-2 py-12 text-center text-gray-500">No records to display.</div>
      )}
    </div>
  );
}
