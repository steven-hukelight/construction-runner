"use client";

import React from "react";
import { useTableDensityClasses } from "@/app/DisplayPreferencesProvider";
import { DataTableShell, initialsFromLabel, TableNameCell } from "../../components/ui/TableChrome";
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
    <DataTableShell
      title="Compliance"
      subtitle={`${rows.length} record${rows.length === 1 ? "" : "s"}`}
    >
      <div className="max-h-[520px] overflow-x-auto overflow-y-auto">
        <table className={`data-table w-full table-auto min-w-[800px] ${density.table}`}>
          <thead className="sticky top-0 z-10">
            <tr className="data-table-header border-b border-blue-100/70 bg-[#eef4fa] text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-slate-500 dark:border-slate-600 dark:bg-slate-900/90 dark:text-slate-400">
              <th className={`${density.th} whitespace-nowrap`}>Name</th>
              <th className={`${density.th} whitespace-nowrap`}>Role</th>
              <th className={`${density.th} whitespace-nowrap`}>Company</th>
              <th className={`${density.th} whitespace-nowrap`}>Site</th>
              <th className={`${density.th} whitespace-nowrap`}>Status</th>
              <th className={`${density.th} whitespace-nowrap`}>RAMS</th>
              <th className={`${density.th} w-8 whitespace-nowrap`}>Missing</th>
              <th className={`${density.th} w-8 whitespace-nowrap`}>Expiry</th>
              <th className={`${density.th} whitespace-nowrap`}>Override</th>
              <th className={`${density.th} w-12`} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`${row.userId}-${row.siteId}-${i}`}
                className="data-table-row cursor-pointer border-b border-slate-100/90 transition-colors last:border-b-0 hover:bg-blue-50/70 dark:border-slate-700/60 dark:hover:bg-slate-700/80"
                onClick={() => onRowClick(row.userId)}
              >
                <td className={density.td}>
                  <TableNameCell initials={initialsFromLabel(row.userName)} label={row.userName} detail={row.trade} role={row.userRole} />
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
                    <span className="status-chip status-chip--info">Override</span>
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
        <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">No records to display.</div>
      )}
    </DataTableShell>
  );
}
