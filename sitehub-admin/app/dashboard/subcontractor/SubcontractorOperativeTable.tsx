"use client";

import React from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Clock,
  FileQuestion,
  ChevronRight,
  Upload,
  CheckCircle,
  ExternalLink,
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
  const map: Record<string, { bg: string; text: string }> = {
    Inducted: { bg: "bg-green-100", text: "text-green-800" },
    Grandfathered: { bg: "bg-blue-100", text: "text-blue-800" },
    "Induction Required": { bg: "bg-amber-100", text: "text-amber-800" },
    "Pre-Induction Required": { bg: "bg-amber-100", text: "text-amber-800" },
    Expired: { bg: "bg-red-100", text: "text-red-800" },
    "Not assigned": { bg: "bg-gray-100", text: "text-gray-700" },
  };
  const style = map[status] ?? { bg: "bg-gray-100", text: "text-gray-700" };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {status}
    </span>
  );
}

function PreInductionBadge({ status }: { status: string }) {
  const label = status.replace("_", " ");
  const map: Record<string, string> = {
    complete: "bg-green-100 text-green-800",
    not_started: "bg-gray-100 text-gray-700",
    in_progress: "bg-amber-100 text-amber-800",
  };
  const cls = map[status] ?? "bg-gray-100 text-gray-700";
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>;
}

export default function SubcontractorOperativeTable({
  rows,
  onRowClick,
  onUploadClick,
  onRequestVerification,
  isMobile = false,
}: Props) {
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
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full table-auto text-sm min-w-[800px]">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">
                Operative
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">
                Trade
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">
                Pre-Induction
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide w-8">
                Missing
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide w-8">
                Expiry
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">
                RAMS
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">
                Induction
              </th>
              <th className="text-left px-2 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr
                key={row.userId}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onRowClick(row)}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {row.avatar ? (
                      <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 bg-gray-100">
                        <Image src={row.avatar} alt="" width={32} height={32} className="object-cover" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm shrink-0">
                        {(row.name || "?")[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{row.name}</div>
                      {row.email && <div className="text-xs text-gray-500">{row.email}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-gray-700">{row.trade || "—"}</td>
                <td className="px-3 py-2.5">
                  <PreInductionBadge status={row.preInductionStatus} />
                </td>
                <td className="px-3 py-2.5">
                  {row.hasMissing ? (
                    <span title={row.missingItems.join(", ")} className="text-amber-600">
                      <AlertTriangle className="h-5 w-5" />
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {row.hasExpiring ? (
                    <span title={row.expiringItems.join(", ")} className="text-amber-600">
                      <Clock className="h-5 w-5" />
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <RAMSStatusBadge status={row.ramsStatus} />
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={row.inductionStatus} />
                </td>
                <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}
