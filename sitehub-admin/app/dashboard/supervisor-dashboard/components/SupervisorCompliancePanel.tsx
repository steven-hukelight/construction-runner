"use client";

import React, { useState, useSyncExternalStore } from "react";
import { Users, CheckCircle, AlertTriangle, XCircle, Shield, Calendar, FileWarning, Briefcase } from "lucide-react";
import { CardSelect } from "../../components/ui/CardSelect";
import { CompanyPicker, SitePicker } from "../../components/ui/SitePicker";
import SupervisorOperativeCard from "./SupervisorOperativeCard";
import SupervisorOperativeDrawer from "./SupervisorOperativeDrawer";
import { preInductionUiEnabled } from "@/lib/featureFlags";
import type {
  SupervisorOperativeRow,
  SupervisorComplianceSummary,
} from "../utils/buildSupervisorComplianceDataset";
import useSWR from "swr";

type Site = { id: string; name?: string };

type Props = {
  sites: Site[];
};

type FilterState = {
  status: string;
  companyId: string;
  trade: string;
  expiry: string;
};

export default function SupervisorCompliancePanel({ sites }: Props) {
  const [siteId, setSiteId] = useState(() => sites[0]?.id ?? "");
  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    companyId: "all",
    trade: "all",
    expiry: "all",
  });
  const [selectedOperative, setSelectedOperative] = useState<SupervisorOperativeRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const effectiveSiteId = siteId || sites[0]?.id || "";

  const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then((r) => (r.ok ? r.json() : null));

  const { data, isLoading } = useSWR<{
    site: { id: string; name: string };
    operatives: SupervisorOperativeRow[];
    summary: SupervisorComplianceSummary;
    companyOptions: { id: string; name: string }[];
    tradeOptions: string[];
  } | null>(
    effectiveSiteId ? `/api/supervisor/compliance?siteId=${encodeURIComponent(effectiveSiteId)}` : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 30000 }
  );

  const isMobile = useMediaQuery("(max-width: 768px)");

  const filteredOperatives = (data?.operatives ?? []).filter((o) => {
    if (filters.status !== "all") {
      const statusMap: Record<string, string[]> = {
        compliant: ["Inducted"],
        grandfathered: ["Grandfathered"],
        override_applied: ["Pre-Induction Override"],
        expired: ["Expired"],
        missing_pre_induction: ["Pre-Induction Required"],
        missing_induction: ["Induction Required"],
      };
      const allowed = statusMap[filters.status];
      if (allowed && !allowed.includes(o.inductionStatus)) return false;
    }
    if (filters.companyId !== "all" && o.companyId !== filters.companyId) return false;
    if (filters.trade !== "all" && o.trade !== filters.trade) return false;
    if (filters.expiry === "expiring" && o.expiringItems.length === 0) return false;
    if (filters.expiry === "expired" && !o.expiringItems.some((e) => e.toLowerCase().includes("expired"))) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <SitePicker
          sites={sites}
          value={siteId}
          onChange={setSiteId}
          variant="compact"
          placeholder="Select site"
          className="w-56"
        />

        {data && (
          <>
            <CardSelect
              items={[
                { id: "compliant", name: "Compliant" },
                ...(preInductionUiEnabled
                  ? [{ id: "missing_pre_induction", name: "Missing Pre-Induction" }]
                  : []),
                { id: "missing_induction", name: "Missing Induction" },
                { id: "expired", name: "Expired" },
                { id: "override_applied", name: "Override Applied" },
                { id: "grandfathered", name: "Grandfathered" },
              ]}
              value={filters.status}
              onChange={(id) => setFilters((f) => ({ ...f, status: id }))}
              icon={Shield}
              fieldLabel="Status"
              variant="compact"
              allowNone
              noneValue="all"
              noneLabel="All statuses"
              className="w-52"
            />
            <CompanyPicker
              companies={data.companyOptions}
              value={filters.companyId}
              onChange={(id) => setFilters((f) => ({ ...f, companyId: id }))}
              variant="compact"
              allowNone
              noneValue="all"
              noneLabel="All companies"
              className="w-52"
            />
            {(data.tradeOptions?.length ?? 0) > 0 ? (
              <CardSelect
                items={data.tradeOptions!.map((t) => ({ id: t, name: t }))}
                value={filters.trade}
                onChange={(id) => setFilters((f) => ({ ...f, trade: id }))}
                icon={Briefcase}
                fieldLabel="Trade"
                variant="compact"
                allowNone
                noneValue="all"
                noneLabel="All trades"
                className="w-48"
              />
            ) : null}
            <CardSelect
              items={[
                { id: "expiring", name: "Expiring soon" },
                { id: "expired", name: "Expired" },
              ]}
              value={filters.expiry}
              onChange={(id) => setFilters((f) => ({ ...f, expiry: id }))}
              icon={Calendar}
              fieldLabel="Expiry"
              variant="compact"
              allowNone
              noneValue="all"
              noneLabel="All"
              className="w-44"
            />
          </>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading…</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            <MetricCard icon={Users} label="Total" value={data.summary.total} color="#2563EB" />
            <MetricCard icon={CheckCircle} label="Compliant" value={data.summary.compliant} color="#059669" />
            <MetricCard icon={AlertTriangle} label="Partial" value={data.summary.partiallyCompliant} color="#D97706" />
            <MetricCard icon={XCircle} label="Non-compliant" value={data.summary.nonCompliant} color="#DC2626" />
            <MetricCard icon={Shield} label="Grandfathered" value={data.summary.grandfathered} color="#2563EB" />
            <MetricCard icon={Shield} label="Override" value={data.summary.overrideApplied} color="#7C3AED" />
            <MetricCard icon={Calendar} label="Expiring" value={data.summary.expiringSoon} color="#D97706" />
            <MetricCard icon={FileWarning} label="Missing" value={data.summary.missingCritical} color="#DC2626" />
          </div>

          <div className="relative">
            {filteredOperatives.length === 0 ? (
              <p className="py-8 text-gray-500 rounded-xl border border-gray-200 bg-white text-center">
                No operatives match the filters.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredOperatives.map((op) => (
                  <SupervisorOperativeCard
                    key={op.operativeId}
                    operative={op}
                    onClick={() => {
                      setSelectedOperative(op);
                      setDrawerOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {drawerOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/30 z-40"
                aria-hidden
                onClick={() => setDrawerOpen(false)}
              />
              <SupervisorOperativeDrawer
                operative={selectedOperative}
                siteId={siteId}
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                isMobile={isMobile}
              />
            </>
          )}
        </>
      ) : siteId ? (
        <p className="py-8 text-gray-500 rounded-xl border border-gray-200 bg-white text-center">
          Failed to load compliance data.
        </p>
      ) : (
        <p className="py-8 text-gray-500 rounded-xl border border-gray-200 bg-white text-center">
          Select a site to view compliance.
        </p>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color }} />
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function useMediaQuery(query: string): boolean {
  const subscribe = (callback: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", callback);
    return () => mq.removeEventListener("change", callback);
  };

  const getSnapshot = () => window.matchMedia(query).matches;
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
