"use client";

import React from "react";
import type { ComplianceUser, ComplianceSite, InductionStatus } from "../server";

function StatusBadge({ status }: { status: InductionStatus }) {
  const styles: Record<InductionStatus, { bg: string; text: string }> = {
    completed: { bg: "bg-emerald-100", text: "text-emerald-800" },
    not_started: { bg: "bg-gray-100", text: "text-gray-700" },
    expired: { bg: "bg-amber-100", text: "text-amber-800" },
  };
  const s = styles[status] ?? styles.not_started;
  const labels: Record<InductionStatus, string> = {
    completed: "Completed",
    not_started: "Not Started",
    expired: "Expired",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md whitespace-nowrap ${s.bg} ${s.text}`}>
      {labels[status]}
    </span>
  );
}

type Props = {
  users: ComplianceUser[];
  sites: ComplianceSite[];
  matrix: Record<string, Record<string, { status: InductionStatus; completedAt: Date | null }>>;
};

export default function ComplianceMatrix({ users, sites, matrix }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full table-auto text-sm min-w-[600px]">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">
                User / Company
              </th>
              {sites.map((s) => (
                <th
                  key={s.id}
                  className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap"
                >
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-gray-900">{u.name}</div>
                  <div className="text-xs text-gray-500">{u.companyName}</div>
                </td>
                {sites.map((s) => {
                  const cell = matrix[u.id]?.[s.id];
                  const status = cell?.status ?? "not_started";
                  return (
                    <td key={s.id} className="px-3 py-2.5">
                      <StatusBadge status={status} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          No users to display.
        </div>
      )}
    </div>
  );
}
