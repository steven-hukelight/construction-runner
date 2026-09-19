"use client";

import React from "react";
import Image from "next/image";
import { useTableDensityClasses } from "@/app/DisplayPreferencesProvider";
import { DataTableShell, TableNameCell } from "../components/ui/TableChrome";
import {
  AlertTriangle,
  Clock,
  ChevronRight,
  Upload,
  CheckCircle,
  ExternalLink,
  UserRound,
} from "lucide-react";
import type { SubcontractorOperativeRow } from "./utils/buildSubcontractorComplianceDataset";
import RAMSStatusBadge from "../components/RAMSStatusBadge";

type Props = {
  rows: SubcontractorOperativeRow[];
  onRowClick: (row: SubcontractorOperativeRow) => void;
  onUploadClick: (row: SubcontractorOperativeRow, e: React.MouseEvent) => void;
  onRequestVerification: (row: SubcontractorOperativeRow, e: React.MouseEvent) => void;
  isMobile?: boolean;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Inducted: "status-chip--ok",
    Grandfathered: "status-chip--info",
    "Induction Required": "status-chip--warn",
    "Pre-Induction Required": "status-chip--warn",
    Expired: "status-chip--danger",
    "Not assigned": "status-chip--muted",
  };
  return <span className={`status-chip ${map[status] ?? "status-chip--muted"}`}>{status}</span>;
}

function PreInductionBadge({ status }: { status: string }) {
  const label = status.replace("_", " ");
  const map: Record<string, string> = {
    complete: "status-chip--ok",
    not_started: "status-chip--muted",
    in_progress: "status-chip--warn",
  };
  return <span className={`status-chip ${map[status] ?? "status-chip--muted"}`}>{label}</span>;
}

export default function SubcontractorOperativeTable({
  rows,
  onRowClick,
  onUploadClick,
  onRequestVerification,
  isMobile = false,
}: Props) {
  const density = useTableDensityClasses();
  if (isMobile) {
    return (
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.userId}
            onClick={() => onRowClick(row)}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-300 transition cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {row.avatar ? (
                  <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 bg-gray-100">
                    <Image src={row.avatar} alt="" width={40} height={40} className="object-cover" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                    {(row.name || "?")[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{row.name}</div>
                  {row.trade && <div className="text-xs text-gray-500">{row.trade}</div>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    <PreInductionBadge status={row.preInductionStatus} />
                    <StatusBadge status={row.inductionStatus} />
                    <RAMSStatusBadge status={row.ramsStatus} />
                  </div>
                  {row.siteNames.length > 0 && (
                    <div className="text-xs text-gray-500 mt-0.5">{row.siteNames.join(", ")}</div>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              {row.hasMissing && (
                <span className="inline-flex items-center gap-1 text-amber-600 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Missing items
                </span>
              )}
              {row.hasExpiring && (
                <span className="inline-flex items-center gap-1 text-amber-600 text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  Expiring
                </span>
              )}
              <div className="flex-1" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUploadClick(row, e);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestVerification(row, e);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Verify
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DataTableShell title="Operatives" subtitle={`${rows.length} people`}>
      <div className="max-h-[520px] overflow-x-auto overflow-y-auto">
        <table className={`data-table w-full table-auto min-w-[800px] ${density.table}`}>
          <thead className="sticky top-0 z-10">
            <tr className="data-table-header border-b border-blue-100/70 bg-[#eef4fa] text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-slate-500">
              <th className={`${density.th} whitespace-nowrap`}>Operative</th>
              <th className={`${density.th} whitespace-nowrap`}>Trade</th>
              <th className={`${density.th} whitespace-nowrap`}>Pre-Induction</th>
              <th className={`${density.th} w-8`}>Missing</th>
              <th className={`${density.th} w-8`}>Expiry</th>
              <th className={`${density.th} whitespace-nowrap`}>RAMS</th>
              <th className={`${density.th} whitespace-nowrap`}>Induction</th>
              <th className={`${density.th} w-24`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.userId}
                className="data-table-row cursor-pointer border-b border-slate-100/90 transition-colors last:border-b-0 hover:bg-blue-50/70"
                onClick={() => onRowClick(row)}
              >
                <td className={density.td}>
                  <TableNameCell icon={UserRound} label={row.name} detail={row.email} />
                </td>
                <td className={`${density.td} text-gray-700`}>{row.trade || "—"}</td>
                <td className={density.td}>
                  <PreInductionBadge status={row.preInductionStatus} />
                </td>
                <td className={density.td}>
                  {row.hasMissing ? (
                    <span title={row.missingItems.join(", ")} className="text-amber-600">
                      <AlertTriangle className="h-5 w-5" />
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className={density.td}>
                  {row.hasExpiring ? (
                    <span title={row.expiringItems.join(", ")} className="text-amber-600">
                      <Clock className="h-5 w-5" />
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className={density.td}>
                  <RAMSStatusBadge status={row.ramsStatus} />
                </td>
                <td className={density.td}>
                  <StatusBadge status={row.inductionStatus} />
                </td>
                <td className={density.td} onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => onUploadClick(row, e)}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      title="Upload documents"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => onRequestVerification(row, e)}
                      className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                      title="Request verification"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(`/dashboard/users/${row.userId}/pre-induction`, "_blank")}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      title="View Pre-Induction"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DataTableShell>
  );
}
