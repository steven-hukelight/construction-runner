"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/dashboard/components/PageHeader";
import QuickInductionSummary from "./components/QuickInductionSummary";
import QuickInductionTable from "./components/QuickInductionTable";

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
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState("");
  const [data, setData] = useState<{
    site: { id: string; name: string };
    operatives: Operative[];
    summary: Summary;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/sites", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        const list = Array.isArray(json) ? json : [];
        setSites(list);
        if (list.length > 0 && !siteId) setSiteId(list[0].id);
      })
      .catch(() => setSites([]));
  }, []);

  useEffect(() => {
    if (!siteId) {
      setData(null);
      return;
    }
    setLoading(true);
    fetch(`/api/sites/${encodeURIComponent(siteId)}/induction-quick`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [siteId]);

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
          value={siteId}
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

      {loading ? (
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
