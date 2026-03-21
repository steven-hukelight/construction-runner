"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/dashboard/components/PageHeader";
import QuickInductionSummary from "./components/QuickInductionSummary";
import QuickInductionTable from "./components/QuickInductionTable";
import useSWR from "swr";

type Site = { id: string; name?: string };
type Operative = {
  operativeId: string;
  operativeName: string;
  companyId: string;
  companyName: string;
  status: "completed" | "not_started" | "expired";
  completedAt: string | null;
};
type Summary = { total: number; completed: number; notStarted: number; expired: number };

export default function QuickInductionPage() {
  const [siteId, setSiteId] = useState("");

  const { data: sites = [] } = useSWR<Site[]>(
    "/api/sites",
    async (url: string) => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
    { fallbackData: [] }
  );

  const selectedSiteId = siteId || sites[0]?.id || "";

  const { data, isLoading } = useSWR<{
    site: { id: string; name: string };
    operatives: Operative[];
    summary: Summary;
  } | null>(
    selectedSiteId ? `/api/sites/${encodeURIComponent(selectedSiteId)}/induction-quick` : null,
    async (url: string) => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    { revalidateOnFocus: true }
  );

  const operativesWithDate = (data?.operatives ?? []).map((o) => ({
    ...o,
    completedAt: o.completedAt ? new Date(o.completedAt) : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Induction Status — Current Site"
        description="View and manage induction status for operatives assigned to the selected site."
        action={
          <Link
            href="/dashboard/supervisor-dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Supervisor
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-4">
        <label htmlFor="supervisor-site" className="text-sm font-medium text-gray-700">
          Site
        </label>
        <select
          id="supervisor-site"
          value={selectedSiteId}
          onChange={(e) => setSiteId(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select site</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || s.id}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading…</div>
      ) : data ? (
        <>
          <QuickInductionSummary summary={data.summary} />
          {data.operatives.length === 0 ? (
            <p className="py-8 text-gray-500 rounded-xl border border-gray-200 bg-white text-center">
              No operatives assigned to this site.
            </p>
          ) : (
            <QuickInductionTable siteId={data.site.id} rows={operativesWithDate} />
          )}
        </>
      ) : siteId ? (
        <p className="py-8 text-gray-500 rounded-xl border border-gray-200 bg-white text-center">
          Failed to load induction data.
        </p>
      ) : (
        <p className="py-8 text-gray-500 rounded-xl border border-gray-200 bg-white text-center">
          Select a site to view induction status.
        </p>
      )}
    </div>
  );
}
