"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import SiteInductionFilters, { type StatusFilter, type CompanyFilter } from "./SiteInductionFilters";
import SiteInductionTable from "./SiteInductionTable";
import Button from "@/app/dashboard/components/ui/Button";
import type { SiteInductionOperative } from "../server";

type Operative = { id: string; name?: string; display_name?: string; email?: string };
type RamsDoc = { id: string; title?: string; companyId?: string; status?: string };

export default function SiteInductionClient({
  siteId,
  siteName,
  mainContractorId,
  operatives: initialOperatives,
  companyOptions,
}: {
  siteId: string;
  siteName: string;
  mainContractorId: string | null;
  operatives: SiteInductionOperative[];
  companyOptions: { id: string; name: string }[];
}) {
  const [operatives, setOperatives] = useState(initialOperatives);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [companyId, setCompanyId] = useState<CompanyFilter>("all");
  const [myCompanyId, setMyCompanyId] = useState<string | null>(null);
  const [companyOperatives, setCompanyOperatives] = useState<Operative[]>([]);
  const [addOperativeId, setAddOperativeId] = useState("");
  const [adding, setAdding] = useState(false);
  const [rams, setRams] = useState<RamsDoc[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    setOperatives(initialOperatives);
  }, [initialOperatives]);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setMyCompanyId(d?.companyId ?? null));
  }, []);

  useEffect(() => {
    if (!myCompanyId) return;
    fetch(`/api/companies/${myCompanyId}/operatives`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setCompanyOperatives(Array.isArray(data) ? data : []))
      .catch(() => setCompanyOperatives([]));
  }, [myCompanyId]);

  useEffect(() => {
    if (!siteId) return;
    Promise.all([
      fetch(`/api/sites/${siteId}/rams`, { credentials: "include" }).then((r) => r.json()),
      fetch("/api/companies", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([ramsList, companiesList]) => {
        setRams(Array.isArray(ramsList) ? ramsList : []);
        setCompanies(Array.isArray(companiesList) ? companiesList : []);
      })
      .catch(() => {});
  }, [siteId]);

  const ramsByCompany = useMemo(() => {
    const acc: Record<string, RamsDoc[]> = {};
    rams.forEach((r) => {
      const cid = (r.companyId as string) ?? "main";
      if (!acc[cid]) acc[cid] = [];
      acc[cid].push(r);
    });
    return acc;
  }, [rams]);
  const companyMap = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.name])), [companies]);

  const assignedIds = useMemo(() => new Set(operatives.map((o) => o.operativeId)), [operatives]);
  const availableOperatives = useMemo(
    () => companyOperatives.filter((o) => !assignedIds.has(o.id)),
    [companyOperatives, assignedIds]
  );
  const isMainContractor = myCompanyId && mainContractorId && myCompanyId === mainContractorId;

  async function handleAddOperative() {
    if (!addOperativeId || !myCompanyId) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/assigned-operatives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operativeId: addOperativeId, companyId: myCompanyId }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        const op = companyOperatives.find((o) => o.id === addOperativeId);
        const name = op?.name ?? op?.display_name ?? op?.email ?? addOperativeId;
        setOperatives((prev) => [
          ...prev,
          { operativeId: addOperativeId, operativeName: name, companyId: myCompanyId, companyName: companyOptions.find((c) => c.id === myCompanyId)?.name ?? "", status: "Induction Required" as const, completedAt: null },
        ]);
        setAddOperativeId("");
        window.dispatchEvent(new Event("induction-operatives-updated"));
      } else {
        alert(data?.message ?? data?.error ?? "Failed to add operative to site");
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveOperative(operativeId: string) {
    try {
      const res = await fetch(
        `/api/sites/${siteId}/assigned-operatives?operativeId=${encodeURIComponent(operativeId)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) {
        setOperatives((prev) => prev.filter((o) => o.operativeId !== operativeId));
        window.dispatchEvent(new Event("induction-operatives-updated"));
      } else {
        const data = await res.json();
        alert(data?.error ?? "Failed to remove");
      }
    } catch {
      alert("Failed to remove");
    }
  }

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
      {/* Operatives on site (induction & RAMS by company) */}
      <div className="rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Operatives on site</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Add operatives from your company so they can work on this site. Induction and RAMS status are shown in the table below.
        </p>
        {isMainContractor && (
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Add operative</label>
              <select
                value={addOperativeId}
                onChange={(e) => setAddOperativeId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select operative…</option>
                {availableOperatives.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name ?? o.display_name ?? o.email ?? o.id}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleAddOperative} disabled={!addOperativeId || adding}>
              {adding ? "Adding…" : "Add to site"}
            </Button>
          </div>
        )}
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {operatives.length} operative{operatives.length !== 1 ? "s" : ""} on this site. View induction status below.
        </p>
      </div>

      {/* RAMS by company */}
      <div className="rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <FileText size={20} className="text-blue-600" />
          RAMS by company
        </h3>
        {Object.keys(ramsByCompany).length === 0 ? (
          <p className="text-gray-500 dark:text-slate-400 text-sm">No RAMS uploaded for this site yet.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(ramsByCompany).map(([cid, list]) => (
              <div key={cid}>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {companyMap[cid] ?? cid}
                </p>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-slate-400">
                  {list.map((r) => (
                    <li key={r.id}>
                      {r.title ?? r.id}
                      {r.status && <span className="ml-2 text-gray-400">({r.status})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

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
        <p className="py-8 text-gray-500 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-center text-gray-500 dark:text-slate-400">
          No operatives match the filters.
        </p>
      ) : (
        <SiteInductionTable
          siteId={siteId}
          rows={filtered}
          myCompanyId={myCompanyId}
          onRemoveOperative={handleRemoveOperative}
        />
      )}
    </div>
  );
}
