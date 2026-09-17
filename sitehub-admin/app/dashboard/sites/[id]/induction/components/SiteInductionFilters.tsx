"use client";

import React from "react";
import { Shield } from "lucide-react";
import { CardSelect } from "../../../../components/ui/CardSelect";
import { CompanyPicker } from "../../../../components/ui/SitePicker";

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
    <div className="flex flex-wrap items-end gap-3">
      <CardSelect
        items={[
          { id: "completed", name: "Completed" },
          { id: "not_started", name: "Not Started" },
          { id: "expired", name: "Expired" },
        ]}
        value={status}
        onChange={(id) => onStatusChange(id as StatusFilter)}
        icon={Shield}
        fieldLabel="Status"
        variant="compact"
        allowNone
        noneValue="all"
        noneLabel="All"
        className="w-48"
      />
      <CompanyPicker
        companies={companyOptions}
        value={companyId}
        onChange={onCompanyChange}
        variant="compact"
        allowNone
        noneValue="all"
        noneLabel="All"
        className="w-52"
      />
    </div>
  );
}
