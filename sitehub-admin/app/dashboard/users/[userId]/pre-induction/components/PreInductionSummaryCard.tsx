"use client";

import React from "react";

const BLUE = "#2563EB";

type PreInductionStatus = "not_started" | "in_progress" | "complete";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  companyName: string | null;
  companyId: string | null;
  role: string | null;
  preInductionStatus: PreInductionStatus;
  adminPreInductionOverride: boolean;
  complianceScore: number | null;
};

type Indicators = {
  rightToWork: "Pending" | "Verified" | "Missing";
  competencyCardComplete: boolean;
  competencyDisplay: string;
  medical: "Pending" | "Verified" | "Missing";
  trainingRecords: number;
  ramsAccepted: boolean;
  declarations: "Accepted" | "Not accepted";
};

interface PreInductionSummaryCardProps {
  user: User | null;
  indicators: Indicators;
}

const STATUS_BADGES: Record<PreInductionStatus, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-gray-100 text-gray-700" },
  in_progress: {
    label: "In Progress",
    className: "bg-amber-100 text-amber-800",
  },
  complete: {
    label: "Complete",
    className: "bg-green-100 text-green-800",
  },
};

export default function PreInductionSummaryCard({
  user,
  indicators,
}: PreInductionSummaryCardProps) {
  const statusBadge = STATUS_BADGES[user?.preInductionStatus ?? "not_started"];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: BLUE }}
        >
          {(user?.name ?? user?.email ?? "?")[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">
            {user?.name ?? user?.email ?? "Unknown"}
          </h2>
          <p className="text-sm text-gray-500">{user?.companyName ?? user?.companyId ?? "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium ${statusBadge.className}`}
          >
            {statusBadge.label}
          </span>
          {user?.adminPreInductionOverride && (
            <span className="inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
              Override
            </span>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Role</dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900">{user?.role ?? "—"}</dd>
        </div>
        {user?.complianceScore != null && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Compliance
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900">{user.complianceScore}%</dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Right to Work
          </dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900">
            {indicators.rightToWork}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Competency Card
          </dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900">
            {indicators.competencyDisplay}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Medical</dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900">{indicators.medical}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Training</dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900">
            {indicators.trainingRecords} records
            {indicators.ramsAccepted ? ", RAMS ✓" : ""}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Declarations
          </dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900">
            {indicators.declarations}
          </dd>
        </div>
      </dl>
    </div>
  );
}
