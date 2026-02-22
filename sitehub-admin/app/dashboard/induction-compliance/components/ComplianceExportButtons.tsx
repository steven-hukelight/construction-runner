"use client";

import React, { useState } from "react";
import { FileDown, FileText } from "lucide-react";
import Button from "@/app/dashboard/components/ui/Button";
import type { FilterState } from "./ComplianceFilters";

type Props = {
  filters: FilterState;
};

function buildQueryString(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.companyId !== "all") params.set("companyId", filters.companyId);
  if (filters.trade !== "all") params.set("trade", filters.trade);
  if (filters.siteId !== "all") params.set("siteId", filters.siteId);
  if (filters.role !== "all") params.set("role", filters.role);
  if (filters.expiry !== "all") params.set("expiry", filters.expiry);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export default function ComplianceExportButtons({ filters }: Props) {
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  async function handleExportCsv() {
    setLoadingCsv(true);
    try {
      const qs = buildQueryString(filters);
      const res = await fetch(`/api/compliance-export/csv${qs}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance_report_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoadingCsv(false);
    }
  }

  async function handleExportPdf() {
    setLoadingPdf(true);
    try {
      const qs = buildQueryString(filters);
      const res = await fetch(`/api/compliance-export/pdf${qs}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoadingPdf(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleExportCsv}
        disabled={loadingCsv || loadingPdf}
        size="sm"
        variant="secondary"
        className="!rounded-lg flex items-center gap-1.5"
      >
        <FileDown className="h-4 w-4" />
        {loadingCsv ? "Exporting…" : "Export CSV"}
      </Button>
      <Button
        onClick={handleExportPdf}
        disabled={loadingCsv || loadingPdf}
        size="sm"
        variant="secondary"
        className="!rounded-lg flex items-center gap-1.5"
      >
        <FileText className="h-4 w-4" />
        {loadingPdf ? "Exporting…" : "Export PDF"}
      </Button>
    </div>
  );
}
