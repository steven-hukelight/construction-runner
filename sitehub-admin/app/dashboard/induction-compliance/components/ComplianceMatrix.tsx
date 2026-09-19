"use client";

import React from "react";
import { UserRound } from "lucide-react";
import { useTableDensityClasses } from "@/app/DisplayPreferencesProvider";
import { DataTableShell, TableNameCell } from "../../components/ui/TableChrome";
import type { ComplianceUser, ComplianceSite, InductionStatus } from "../server";

function StatusBadge({ status }: { status: InductionStatus }) {
  const labels: Record<InductionStatus, string> = {
    completed: "Completed",
    not_started: "Not Started",
    expired: "Expired",
  };
  const chip =
    status === "completed" ? "status-chip--ok" : status === "expired" ? "status-chip--danger" : "status-chip--muted";
  return <span className={`status-chip ${chip}`}>{labels[status]}</span>;
}

type Props = {
  users: ComplianceUser[];
  sites: ComplianceSite[];
  matrix: Record<string, Record<string, { status: InductionStatus; completedAt: Date | null }>>;
};

export default function ComplianceMatrix({ users, sites, matrix }: Props) {
  const density = useTableDensityClasses();
  return (
    <DataTableShell title="Induction matrix" subtitle={`${users.length} user${users.length === 1 ? "" : "s"}`}>
      <div className="max-h-[520px] overflow-x-auto overflow-y-auto">
        <table className={`data-table w-full table-auto min-w-[600px] ${density.table}`}>
          <thead className="sticky top-0 z-10">
            <tr className="data-table-header border-b border-blue-100/70 bg-[#eef4fa] text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-slate-500 dark:border-slate-600 dark:bg-slate-900/90 dark:text-slate-400">
              <th className={`${density.th} whitespace-nowrap`}>User / Company</th>
              {sites.map((s) => (
                <th key={s.id} className={`${density.th} whitespace-nowrap`}>
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="data-table-row border-b border-slate-100/90 transition-colors last:border-b-0 hover:bg-blue-50/70 dark:border-slate-700/60 dark:hover:bg-slate-700/80"
              >
                <td className={density.td}>
                  <TableNameCell icon={UserRound} label={u.name} detail={u.companyName} />
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
        <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">No users to display.</div>
      )}
    </DataTableShell>
  );
}
