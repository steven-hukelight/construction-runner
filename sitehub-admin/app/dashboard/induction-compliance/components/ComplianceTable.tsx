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

export default function ComplianceTable({
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
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full table-auto text-sm min-w-[800px]">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">
                Name
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">
                Role
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">
                Company
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">
                Site
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">
                Status
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">
                RAMS
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide w-8">
                Missing
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap w-8">
                Expiry
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">
                Override
              </th>
              <th className="text-left px-2 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => (
              <tr
                key={`${row.userId}-${row.siteId}-${i}`}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onRowClick(row.userId)}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm shrink-0">
                      {(row.userName || "?")[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{row.userName}</div>
                      {row.trade && (
                        <div className="text-xs text-gray-500">{row.trade}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {row.userRole ?? "OPERATIVE"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-gray-700">{row.companyName}</td>
                <td className="px-3 py-2.5 text-gray-700">{row.siteName}</td>
                <td className="px-3 py-2.5">
                  <ComplianceStatusBadge status={row.status} />
                </td>
                <td className="px-3 py-2.5" title={row.ramsVersion ? `Version: ${row.ramsVersion}${row.ramsAcceptedAt ? ` | Accepted: ${row.ramsAcceptedAt.toLocaleString()}` : ""}` : undefined}>
                  <RAMSStatusBadge status={row.ramsStatus} />
                </td>
                <td className="px-3 py-2.5">
                  <ComplianceMissingItemsIcon items={row.missingItems} />
                </td>
                <td className="px-3 py-2.5">
                  <ComplianceExpiryWarnings items={row.expiryWarnings} />
                </td>
                <td className="px-3 py-2.5">
                  {row.adminPreInductionOverride ? (
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-md bg-purple-100 text-purple-800">
                      Override
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div className="py-12 text-center text-gray-500">No records to display.</div>
      )}
    </div>
  );
}
