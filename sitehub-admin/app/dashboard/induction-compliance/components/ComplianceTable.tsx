"use client";

import React from "react";
import { useTableDensityClasses } from "@/app/DisplayPreferencesProvider";
import type { ComplianceRow } from "../server";
import ComplianceStatusBadge from "./ComplianceStatusBadge";
import ComplianceMissingItemsIcon from "./ComplianceMissingItemsIcon";
import ComplianceExpiryWarnings from "./ComplianceExpiryWarnings";
import ComplianceRowActions from "./ComplianceRowActions";
import RAMSStatusBadge from "../../components/RAMSStatusBadge";
import RoleBadge from "../../components/RoleBadge";

type Props = {
  rows: ComplianceRow[];
  isSubcontractorAdmin: boolean;
  onRowClick: (userId: string) => void;
  onViewDetails: (userId: string) => void;
  onAssignToSite?: (userId: string, siteId: string, companyId?: string) => void;
  onMarkInducted?: (userId: string, siteId: string) => void;
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
  onMarkInducted,
  onResetInduction,
  onRequestDocuments,
  onApplyOverride,
  onRemoveFromSite,
}: Props) {
  const density = useTableDensityClasses();
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className={`w-full table-auto min-w-[800px] ${density.table}`}>
          <thead className="sticky top-0 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-600 z-10">
            <tr>
              <th className={`text-left ${density.th} text-xs font-semibold text-gray-700 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap`}>
                Name
              </th>
              <th className={`text-left ${density.th} text-xs font-semibold text-gray-700 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap`}>
                Role
              </th>
              <th className={`text-left ${density.th} text-xs font-semibold text-gray-700 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap`}>
                Company
              </th>
              <th className={`text-left ${density.th} text-xs font-semibold text-gray-700 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap`}>
                Site
              </th>
              <th className={`text-left ${density.th} text-xs font-semibold text-gray-700 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap`}>
                Status
              </th>
              <th className={`text-left ${density.th} text-xs font-semibold text-gray-700 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap`}>
                RAMS
              </th>
              <th className={`text-left ${density.th} text-xs font-semibold text-gray-700 dark:text-slate-400 uppercase tracking-wide w-8`}>
                Missing
              </th>
              <th className={`text-left ${density.th} text-xs font-semibold text-gray-700 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap w-8`}>
                Expiry
              </th>
              <th className={`text-left ${density.th} text-xs font-semibold text-gray-700 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap`}>
                Override
              </th>
              <th className={`text-left ${density.th} text-xs font-semibold text-gray-700 dark:text-slate-400 uppercase tracking-wide w-12`} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-600">
            {rows.map((row, i) => (
              <tr
                key={`${row.userId}-${row.siteId}-${i}`}
                className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                onClick={() => onRowClick(row.userId)}
              >
                <td className={density.td}>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 font-medium text-sm shrink-0">
                      {(row.userName || "?")[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-slate-100">{row.userName}</div>
                      {row.trade && (
                        <div className="text-xs text-gray-500 dark:text-slate-400">{row.trade}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className={density.td}>
                  <RoleBadge role={row.userRole ?? "OPERATIVE"} />
                </td>
                <td className={`${density.td} text-gray-700 dark:text-slate-200`}>{row.companyName}</td>
                <td className={`${density.td} text-gray-700 dark:text-slate-200`}>{row.siteName}</td>
                <td className={density.td}>
                  <ComplianceStatusBadge status={row.status} siteId={row.siteId} />
                </td>
                <td
                  className={density.td}
                  title={
                    row.ramsVersion
                      ? `Version: ${row.ramsVersion}${
                          row.ramsAcceptedAt
                            ? ` | Accepted: ${new Date(row.ramsAcceptedAt).toLocaleString()}`
                            : ""
                        }`
                      : undefined
                  }
                >
                  <RAMSStatusBadge status={row.ramsStatus} />
                </td>
                <td className={density.td}>
                  <ComplianceMissingItemsIcon items={row.missingItems} />
                </td>
                <td className={density.td}>
                  <ComplianceExpiryWarnings items={row.expiryWarnings} />
                </td>
                <td className={density.td}>
                  {row.adminPreInductionOverride ? (
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300">
                      Override
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-slate-500">—</span>
                  )}
                </td>
                <td className={density.td} onClick={(e) => e.stopPropagation()}>
                  <ComplianceRowActions
                    row={row}
                    isSubcontractorAdmin={isSubcontractorAdmin}
                    onViewDetails={onViewDetails}
                    onAssignToSite={onAssignToSite}
                    onMarkInducted={onMarkInducted}
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
        <div className="py-12 text-center text-gray-500 dark:text-slate-400">No records to display.</div>
      )}
    </div>
  );
}
