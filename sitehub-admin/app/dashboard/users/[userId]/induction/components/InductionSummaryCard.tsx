"use client";

import React from "react";

const BLUE = "#2563EB";

type Summary = {
  totalSitesInducted: number;
  lastInductionDate: Date | null;
  activeCount: number;
  expiredCount: number;
};

type User = {
  id: string;
  name: string | null;
  email: string | null;
  companyId: string | null;
  companyName: string | null;
  role: string | null;
};

export default function InductionSummaryCard({
  user,
  summary,
}: {
  user: User | null;
  summary: Summary;
}) {
  const lastDate =
    summary.lastInductionDate instanceof Date
      ? summary.lastInductionDate
      : summary.lastInductionDate
        ? new Date(summary.lastInductionDate)
        : null;
  const lastFormatted = lastDate
    ? lastDate.toLocaleDateString(undefined, {
        dateStyle: "medium",
      })
    : "—";

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      style={{ borderColor: "rgba(229, 231, 235, 1)" }}
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: BLUE }}
        >
          {(user?.name ?? user?.email ?? "?")[0].toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {user?.name ?? user?.email ?? "Unknown"}
          </h2>
          <p className="text-sm text-gray-500">{user?.companyName ?? user?.companyId ?? "—"}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Role</dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900">{user?.role ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Sites inducted</dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900">{summary.totalSitesInducted}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Last induction</dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900">{lastFormatted}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Active</dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900">{summary.activeCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Expired</dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900">{summary.expiredCount}</dd>
        </div>
      </dl>
    </div>
  );
}
