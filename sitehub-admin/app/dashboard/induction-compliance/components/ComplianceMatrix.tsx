"use client";

import React from "react";
import { useTableDensityClasses } from "@/app/DisplayPreferencesProvider";
import type { ComplianceUser, ComplianceSite, InductionStatus } from "../server";

function StatusBadge({ status }: { status: InductionStatus }) {
  const styles: Record<InductionStatus, { bg: string; text: string }> = {
    completed: { bg: "bg-emerald-100 dark:bg-emerald-900/50", text: "text-emerald-800 dark:text-emerald-300" },
    not_started: { bg: "bg-gray-100 dark:bg-slate-700", text: "text-gray-700 dark:text-slate-300" },
    expired: { bg: "bg-amber-100 dark:bg-amber-900/50", text: "text-amber-800 dark:text-amber-300" },
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
  const density = useTableDensityClasses();
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className={`w-full table-auto min-w-[600px] ${density.table}`}>
          <thead className="sticky top-0 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-600 z-10">
            <tr>
              <th className={`text-left ${density.th} text-xs font-semibold text-gray-700 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap`}>
                User / Company
              </th>
              {sites.map((s) => (
                <th
                  key={s.id}
                  className={`text-left ${density.th} text-xs font-semibold text-gray-700 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap`}
                >
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-600">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className={density.td}>
                  <div className="font-medium text-gray-900 dark:text-slate-100">{u.name}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">{u.companyName}</div>
                </td>
                {sites.map((s) => {
                  const cell = matrix[u.id]?.[s.id];
                  const status = cell?.status ?? "not_started";
                  return (
                    <td key={s.id} className={density.td}>
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
        <div className="py-12 text-center text-gray-500 dark:text-slate-400">
          No users to display.
        </div>
      )}
    </div>
  );
}
