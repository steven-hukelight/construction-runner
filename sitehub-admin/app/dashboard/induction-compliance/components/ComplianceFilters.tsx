"use client";

import React from "react";
import type { ComplianceSite } from "../server";

export type StatusFilter =
  | "all"
  | "compliant"
  | "missing_pre_induction"
  | "missing_induction"
  | "expired"
  | "override_applied"
  | "grandfathered";

export type ExpiryFilter = "all" | "expiring_30" | "expiring_60" | "expired";

export type FilterState = {
  status: StatusFilter;
  companyId: string;
  trade: string;
  siteId: string;
  role: string;
  expiry: ExpiryFilter;
  search: string;
};

type Props = {
  sites: ComplianceSite[];
  companyOptions: { id: string; name: string }[];
  tradeOptions: string[];
  roleOptions: string[];
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
};

export default function ComplianceFilters({
  sites,
  companyOptions,
  tradeOptions,
  roleOptions,
  filters,
  onFiltersChange,
}: Props) {
  const update = (partial: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const selectClass =
    "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="compliance-search" className="text-sm font-medium text-gray-700">
          Search
        </label>
        <input
          id="compliance-search"
          type="search"
          placeholder="Name, company, CSCS..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className={`${selectClass} min-w-[180px]`}
        />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="compliance-status" className="text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="compliance-status"
          value={filters.status}
          onChange={(e) => update({ status: e.target.value as StatusFilter })}
          className={selectClass}
        >
          <option value="all">All</option>
          <option value="compliant">Compliant</option>
          <option value="missing_pre_induction">Pre-Induction Required</option>
          <option value="missing_induction">Induction Required</option>
          <option value="expired">Expired</option>
          <option value="override_applied">Override Applied</option>
          <option value="grandfathered">Grandfathered</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="compliance-company" className="text-sm font-medium text-gray-700">
          Company
        </label>
        <select
          id="compliance-company"
          value={filters.companyId}
          onChange={(e) => update({ companyId: e.target.value })}
          className={selectClass}
        >
          <option value="all">All companies</option>
          {companyOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {tradeOptions.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="compliance-trade" className="text-sm font-medium text-gray-700">
            Trade
          </label>
          <select
            id="compliance-trade"
            value={filters.trade}
            onChange={(e) => update({ trade: e.target.value })}
            className={selectClass}
          >
            <option value="all">All trades</option>
            {tradeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}

      {roleOptions.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="compliance-role" className="text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            id="compliance-role"
            value={filters.role}
            onChange={(e) => update({ role: e.target.value })}
            className={selectClass}
          >
            <option value="all">All roles</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <label htmlFor="compliance-site" className="text-sm font-medium text-gray-700">
          Site
        </label>
        <select
          id="compliance-site"
          value={filters.siteId}
          onChange={(e) => update({ siteId: e.target.value })}
          className={selectClass}
        >
          <option value="all">All sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="compliance-expiry" className="text-sm font-medium text-gray-700">
          Expiry
        </label>
        <select
          id="compliance-expiry"
          value={filters.expiry}
          onChange={(e) => update({ expiry: e.target.value as ExpiryFilter })}
          className={selectClass}
        >
          <option value="all">All</option>
          <option value="expiring_30">Expiring in 30 days</option>
          <option value="expiring_60">Expiring in 60 days</option>
          <option value="expired">Expired</option>
        </select>
      </div>
    </div>
  );
}
