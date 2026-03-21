"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import ComplianceFilters, { type FilterState } from "./ComplianceFilters";
import ComplianceTable from "./ComplianceTable";
import ComplianceCards from "./ComplianceCards";
import ComplianceDrawer from "./ComplianceDrawer";
import ComplianceExportButtons from "./ComplianceExportButtons";
import Button from "@/app/dashboard/components/ui/Button";
import type { ComplianceRow, ComplianceSite } from "../server";

type Props = {
  sites: ComplianceSite[];
  companyOptions: { id: string; name: string }[];
  tradeOptions: string[];
  roleOptions: string[];
  rows: ComplianceRow[];
  role: string | undefined;
};

function filterRows(rows: ComplianceRow[], filters: FilterState): ComplianceRow[] {
  let out = rows;

  if (filters.status !== "all") {
    out = out.filter((r) => r.status === filters.status);
  }
  if (filters.companyId !== "all") {
    out = out.filter((r) => r.companyId === filters.companyId);
  }
  if (filters.trade !== "all") {
    out = out.filter((r) => r.trade === filters.trade);
  }
  if (filters.siteId !== "all") {
    out = out.filter((r) => r.siteId === filters.siteId);
  }
  if (filters.role !== "all") {
    out = out.filter((r) => (r.userRole ?? "OPERATIVE") === filters.role);
  }
  if (filters.expiry !== "all") {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    out = out.filter((r) => {
      const warnings = r.expiryWarnings ?? [];
      if (filters.expiry === "expired") {
        return warnings.some((w) => w.expiry.getTime() < now);
      }
      if (filters.expiry === "expiring_30") {
        return warnings.some((w) => {
          const t = w.expiry.getTime();
          return t >= now && t - now <= 30 * day;
        });
      }
      if (filters.expiry === "expiring_60") {
        return warnings.some((w) => {
          const t = w.expiry.getTime();
          return t >= now && t - now <= 60 * day;
        });
      }
      return true;
    });
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    out = out.filter(
      (r) =>
        r.userName.toLowerCase().includes(q) ||
        r.companyName.toLowerCase().includes(q) ||
        r.cscsNumber?.toLowerCase().includes(q)
    );
  }

  return out;
}

export default function ComplianceClient({
  sites,
  companyOptions,
  tradeOptions,
  roleOptions,
  rows,
  role,
}: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    companyId: "all",
    trade: "all",
    siteId: "all",
    role: "all",
    expiry: "all",
    search: "",
  });
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const [viewport, setViewport] = useState({ isMobile: false, isTabletOrSmaller: false });

  React.useEffect(() => {
    const mobile = window.matchMedia("(max-width: 768px)");
    const tablet = window.matchMedia("(max-width: 1024px)");
    const update = () =>
      setViewport({ isMobile: mobile.matches, isTabletOrSmaller: tablet.matches });
    update();
    mobile.addEventListener("change", update);
    tablet.addEventListener("change", update);
    return () => {
      mobile.removeEventListener("change", update);
      tablet.removeEventListener("change", update);
    };
  }, []);

  const filteredRows = useMemo(() => filterRows(rows, filters), [rows, filters]);
  const isSubcontractorAdmin = role === "sub_admin";

  const handleRowClick = useCallback((userId: string) => {
    setDrawerUserId(userId);
    setDrawerOpen(true);
  }, []);

  const handleViewDetails = useCallback((userId: string) => {
    setDrawerUserId(userId);
    setDrawerOpen(true);
  }, []);

  const handleAssignToSite = useCallback((userId: string, siteId: string) => {
    router.push(`/dashboard/sites/${siteId}?assign=${userId}`);
  }, [router]);

  const handleResetInduction = useCallback(async (userId: string, siteId: string) => {
    if (!confirm("Reset induction? The operative will need to complete it again.")) return;
    const res = await fetch("/api/induction/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, siteId }),
    });
    if (res.ok) router.refresh();
    else alert("Failed to reset");
  }, [router]);

  const handleFiltersChange = useCallback((f: FilterState) => {
    setFilters(f);
    setFiltersSheetOpen(false);
  }, []);

  const filtersEl = (
    <ComplianceFilters
      sites={sites}
      companyOptions={companyOptions}
      tradeOptions={tradeOptions}
      roleOptions={roleOptions}
      filters={filters}
      onFiltersChange={handleFiltersChange}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {viewport.isMobile ? (
          <>
            <Button
              onClick={() => setFiltersSheetOpen(true)}
              variant="secondary"
              size="sm"
              className="!rounded-lg flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            {filtersSheetOpen && (
              <>
                <div
                  className="fixed inset-0 bg-black/30 z-40"
                  onClick={() => setFiltersSheetOpen(false)}
                  aria-hidden
                />
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">Filters</h3>
                    <button
                      type="button"
                      onClick={() => setFiltersSheetOpen(false)}
                      className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    >
                      Done
                    </button>
                  </div>
                  {filtersEl}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-4">{filtersEl}</div>
        )}
        <ComplianceExportButtons filters={filters} />
      </div>

      <div className="relative">
        {viewport.isTabletOrSmaller ? (
          <ComplianceCards
            rows={filteredRows}
            isSubcontractorAdmin={isSubcontractorAdmin}
            onRowClick={handleRowClick}
            onViewDetails={handleViewDetails}
            onAssignToSite={!isSubcontractorAdmin ? handleAssignToSite : undefined}
            onResetInduction={!isSubcontractorAdmin ? handleResetInduction : undefined}
          />
        ) : (
          <ComplianceTable
            rows={filteredRows}
            isSubcontractorAdmin={isSubcontractorAdmin}
            onRowClick={handleRowClick}
            onViewDetails={handleViewDetails}
            onAssignToSite={!isSubcontractorAdmin ? handleAssignToSite : undefined}
            onResetInduction={!isSubcontractorAdmin ? handleResetInduction : undefined}
          />
        )}
      </div>

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            aria-hidden
            onClick={() => setDrawerOpen(false)}
          />
          <ComplianceDrawer
            userId={drawerUserId}
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            isSubcontractorAdmin={isSubcontractorAdmin}
            isMobile={viewport.isMobile}
            onActionComplete={() => router.refresh()}
          />
        </>
      )}
    </div>
  );
}
