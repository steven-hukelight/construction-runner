"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Building2, Users, FileText } from "lucide-react";
import useSWR from "swr";

type Subcontractor = { companyId: string; companyName?: string };
type AssignedOp = { id: string; operativeId: string; companyId: string; status?: string };
type RamsDoc = { id: string; title?: string; companyId?: string; status?: string };

export default function SiteSubcontractorsTab({ siteId }: { siteId: string }) {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [assigned, setAssigned] = useState<AssignedOp[]>([]);
  const [rams, setRams] = useState<RamsDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: companies = [] } = useSWR(
    "/api/companies",
    async (url: string) => {
      const res = await fetch(url, { cache: "no-store", credentials: "include" });
      const list = await res.json();
      return Array.isArray(list) ? list : [];
    },
    { revalidateOnFocus: false }
  );
  const companyMap = useMemo(() => {
    const m: Record<string, string> = {};
    (companies as { id?: string; name?: string }[]).forEach((c) => {
      if (c?.id && c?.name) m[String(c.id)] = String(c.name);
    });
    return m;
  }, [companies]);

  useEffect(() => {
    if (!siteId) return;
    Promise.all([
      fetch(`/api/sites/${siteId}/subcontractors`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/sites/${siteId}/assigned-operatives`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/sites/${siteId}/rams`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([subs, assignedList, ramsList]) => {
        setSubcontractors(Array.isArray(subs) ? subs : []);
        setAssigned(Array.isArray(assignedList) ? assignedList : []);
        setRams(Array.isArray(ramsList) ? ramsList : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId]);

  const ramsByCompany = rams.reduce<Record<string, RamsDoc[]>>((acc, r) => {
    const cid = (r.companyId as string) ?? "main";
    if (!acc[cid]) acc[cid] = [];
    acc[cid].push(r);
    return acc;
  }, {});

  const assignedByCompany = assigned.reduce<Record<string, AssignedOp[]>>((acc, a) => {
    const cid = a.companyId ?? "main";
    if (!acc[cid]) acc[cid] = [];
    acc[cid].push(a);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 size={20} className="text-blue-600" />
          Subcontractor companies
        </h3>
        {subcontractors.length === 0 ? (
          <p className="text-gray-500 text-sm">No subcontractors linked to this site yet.</p>
        ) : (
          <ul className="space-y-2">
            {subcontractors.map((s) => (
              <li key={s.companyId} className="flex items-center gap-2 text-gray-700">
                <Building2 size={16} className="text-gray-400" />
                {s.companyName || s.companyId}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm text-gray-500">
          Invite new partners from the{" "}
          <Link href="/dashboard/subcontractors" className="text-blue-600 hover:underline">Subcontractors</Link> page.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users size={20} className="text-blue-600" />
          Operatives by company
        </h3>
        {Object.keys(assignedByCompany).length === 0 ? (
          <p className="text-gray-500 text-sm">No operatives assigned to this site yet.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(assignedByCompany).map(([companyId, list]) => (
              <div key={companyId}>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {companyMap[companyId] ?? companyId}
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {list.map((a) => (
                    <li key={a.id}>Operative ID: {a.operativeId}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText size={20} className="text-blue-600" />
          RAMS by company
        </h3>
        {Object.keys(ramsByCompany).length === 0 ? (
          <p className="text-gray-500 text-sm">No RAMS uploaded for this site yet.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(ramsByCompany).map(([companyId, list]) => (
              <div key={companyId}>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {companyMap[companyId] ?? companyId}
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
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
    </div>
  );
}
