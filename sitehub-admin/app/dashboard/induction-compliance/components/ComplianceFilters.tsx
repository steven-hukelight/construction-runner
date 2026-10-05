"use client";

import React from "react";
import { Briefcase, Calendar, Filter, Shield } from "lucide-react";
import { CardSelect } from "../../components/ui/CardSelect";
import { CompanyPicker, SitePicker } from "../../components/ui/SitePicker";
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

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="compliance-search" className="text-sm font-medium text-gray-700 dark:text-slate-300">
          Search
        </label>
        <input
          id="compliance-search"
          type="search"
          placeholder="Name, company, CSCS..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="min-w-[180px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <CardSelect
        items={[
          { id: "compliant", name: "Compliant" },
          { id: "missing_pre_induction", name: "Pre-Induction Required" },
          { id: "missing_induction", name: "Induction Required" },
          { id: "expired", name: "Expired" },
          { id: "override_applied", name: "Override Applied" },
          { id: "grandfathered", name: "Grandfathered" },
        ]}
        value={filters.status}
        onChange={(id) => update({ status: id as StatusFilter })}
        icon={Shield}
        fieldLabel="Status"
        variant="compact"
        allowNone
        noneValue="all"
        noneLabel="All"
        className="w-52"
      />

      <CompanyPicker
        companies={companyOptions}
        value={filters.companyId}
        onChange={(id) => update({ companyId: id })}
        variant="compact"
        allowNone
        noneValue="all"
        noneLabel="All companies"
        className="w-52"
      />

      {tradeOptions.length > 0 ? (
        <CardSelect
          items={tradeOptions.map((t) => ({ id: t, name: t }))}
          value={filters.trade}
          onChange={(id) => update({ trade: id })}
          icon={Briefcase}
          fieldLabel="Trade"
          variant="compact"
          allowNone
          noneValue="all"
          noneLabel="All trades"
          className="w-48"
        />
      ) : null}

      {roleOptions.length > 0 ? (
        <CardSelect
          items={roleOptions.map((r) => ({ id: r, name: r }))}
          value={filters.role}
          onChange={(id) => update({ role: id })}
          icon={Filter}
          fieldLabel="Role"
          variant="compact"
          allowNone
          noneValue="all"
          noneLabel="All roles"
          className="w-44"
        />
      ) : null}

      <SitePicker
        sites={sites}
        value={filters.siteId}
        onChange={(id) => update({ siteId: id })}
        variant="compact"
        allowNone
        noneValue="all"
        noneLabel="All sites"
        className="w-52"
      />

      <CardSelect
        items={[
          { id: "expiring_30", name: "Expiring in 30 days" },
          { id: "expiring_60", name: "Expiring in 60 days" },
          { id: "expired", name: "Expired" },
        ]}
        value={filters.expiry}
        onChange={(id) => update({ expiry: id as ExpiryFilter })}
        icon={Calendar}
        fieldLabel="Expiry"
        variant="compact"
        allowNone
        noneValue="all"
        noneLabel="All"
        className="w-52"
      />
    </div>
  );
}
