"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import SiteInductionFilters, { type StatusFilter, type CompanyFilter } from "./SiteInductionFilters";
import SiteInductionTable from "./SiteInductionTable";
import type { SiteInductionOperative } from "../server";

export default function SiteInductionClient({
  siteId,
  siteName,
  operatives,
  companyOptions,
}: {
  siteId: string;
  siteName: string;
  operatives: SiteInductionOperative[];
  companyOptions: { id: string; name: string }[];
}) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [companyId, setCompanyId] = useState<CompanyFilter>("all");

  const filtered = useMemo(() => {
    let list = operatives;
    if (status !== "all") {
      list = list.filter((o) => {
        if (status === "completed") return o.status === "Inducted" || o.status === "Grandfathered";
        if (status === "not_started") return ["Pre-Induction Required", "Pre-Induction Override", "Induction Required"].includes(o.status);
        if (status === "expired") return o.status === "Expired";
        return false;
      });
    }
    if (companyId !== "all") list = list.filter((o) => o.companyId === companyId);
    return list;
  }, [operatives, status, companyId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/dashboard/sites/${siteId}`}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          ← Back to {siteName}
        </Link>
        <SiteInductionFilters
          status={status}
          companyId={companyId}
          companyOptions={companyOptions}
          onStatusChange={setStatus}
          onCompanyChange={setCompanyId}
        />
      </div>
      {filtered.length === 0 ? (
        <p className="py-8 text-gray-500 rounded-xl border border-gray-200 bg-white text-center">
          No operatives match the filters.
        </p>
      ) : (
        <SiteInductionTable siteId={siteId} rows={filtered} />
      )}
    </div>
  );
}
