"use client";

import React from "react";

export type StatusFilter = "all" | "completed" | "not_started" | "expired";
export type CompanyFilter = string; // "all" or companyId

type Props = {
  status: StatusFilter;
  companyId: CompanyFilter;
  companyOptions: { id: string; name: string }[];
  onStatusChange: (value: StatusFilter) => void;
  onCompanyChange: (value: CompanyFilter) => void;
};

export default function SiteInductionFilters({
  status,
  companyId,
  companyOptions,
  onStatusChange,
  onCompanyChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="induction-status" className="text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="induction-status"
          value={status}
          onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All</option>
          <option value="completed">Completed</option>
          <option value="not_started">Not Started</option>
          <option value="expired">Expired</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="induction-company" className="text-sm font-medium text-gray-700">
          Company
        </label>
        <select
          id="induction-company"
          value={companyId}
          onChange={(e) => onCompanyChange(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All</option>
          {companyOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
