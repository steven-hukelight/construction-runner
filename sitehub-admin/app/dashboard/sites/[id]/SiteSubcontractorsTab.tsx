"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Building2, Users, X } from "lucide-react";
import useSWR from "swr";
import Button from "@/app/dashboard/components/ui/Button";

type Subcontractor = { companyId: string; companyName?: string };
type AssignedOp = { id: string; operativeId: string; companyId?: string | null; user_id?: string; status?: string };
type Operative = { id: string; name?: string; display_name?: string; email?: string };

export default function SiteSubcontractorsTab({ siteId }: { siteId: string }) {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [assigned, setAssigned] = useState<AssignedOp[]>([]);
  const [loading, setLoading] = useState(true);
  const [myCompanyId, setMyCompanyId] = useState<string | null>(null);
  const [operatives, setOperatives] = useState<Operative[]>([]);
  const [addOperativeId, setAddOperativeId] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
      fetch("/api/me", { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/sites/${siteId}/subcontractors`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/sites/${siteId}/assigned-operatives`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([me, subs, assignedList]) => {
        setMyCompanyId(me?.companyId ?? null);
        setSubcontractors(Array.isArray(subs) ? subs : []);
        setAssigned(Array.isArray(assignedList) ? assignedList : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId]);

  const subCompanyIds = useMemo(() => new Set(subcontractors.map((s) => s.companyId)), [subcontractors]);

  useEffect(() => {
    if (!myCompanyId || !subCompanyIds.has(myCompanyId)) return;
    fetch(`/api/companies/${myCompanyId}/operatives`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setOperatives(Array.isArray(data) ? data : []))
      .catch(() => setOperatives([]));
  }, [myCompanyId, subCompanyIds]);

  const assignedSubIds = useMemo(
    () => new Set(assigned.filter((a) => a.companyId && subCompanyIds.has(a.companyId)).map((a) => a.operativeId ?? a.user_id ?? (a as { id?: string }).id).filter(Boolean)),
    [assigned, subCompanyIds]
  );
  const availableOperatives = useMemo(
    () => operatives.filter((o) => !assignedSubIds.has(o.id)),
    [operatives, assignedSubIds]
  );
  const isSubcontractor = myCompanyId && subCompanyIds.has(myCompanyId);

  async function handleAddSubOperative() {
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
        setAssigned((prev) => [
          ...prev,
          {
            id: addOperativeId,
            operativeId: addOperativeId,
            user_id: addOperativeId,
            companyId: myCompanyId,
          } as AssignedOp,
        ]);
        setAddOperativeId("");
      } else {
        alert(data?.message ?? data?.error ?? "Failed to add operative to site");
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveSubOperative(operativeId: string) {
    setRemovingId(operativeId);
    try {
      const res = await fetch(
        `/api/sites/${siteId}/assigned-operatives?operativeId=${encodeURIComponent(operativeId)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) {
        setAssigned((prev) => prev.filter((a) => (a.operativeId ?? a.user_id ?? (a as { id?: string }).id) !== operativeId));
      } else {
        const data = await res.json();
        alert(data?.error ?? "Failed to remove");
      }
    } finally {
      setRemovingId(null);
    }
  }

  const operativeMap = useMemo(() => {
    const m: Record<string, string> = {};
    operatives.forEach((o) => {
      m[o.id] = o.name ?? o.display_name ?? o.email ?? o.id;
    });
    return m;
  }, [operatives]);

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

      <div className="rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Users size={20} className="text-blue-600" />
          Operatives on site – Subcontractors
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Operatives from subcontractor companies on this site. Subcontractors add their own operatives here.
        </p>
        {isSubcontractor && (
          <div className="flex flex-wrap items-end gap-3 mb-6">
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
            <Button
              onClick={handleAddSubOperative}
              disabled={!addOperativeId || adding}
            >
              {adding ? "Adding…" : "Add to site"}
            </Button>
          </div>
        )}
        {(() => {
          const subAssigned = assigned.filter((a) => a.companyId && subCompanyIds.has(a.companyId));
          if (subAssigned.length === 0) {
            return <p className="text-gray-500 dark:text-slate-400 text-sm">No subcontractor operatives on this site yet.</p>;
          }
          const byCompany = subAssigned.reduce<Record<string, AssignedOp[]>>((acc, a) => {
            const cid = a.companyId ?? "main";
            if (!acc[cid]) acc[cid] = [];
            acc[cid].push(a);
            return acc;
          }, {});
          return (
            <div className="space-y-4">
              {Object.entries(byCompany).map(([cid, list]) => (
                <div key={cid}>
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    {companyMap[cid] ?? cid}
                  </p>
                  <ul className="space-y-1">
                    {list.map((a) => {
                      const opId = a.operativeId ?? a.user_id ?? (a as { id?: string }).id;
                      const name = operativeMap[opId ?? ""] ?? `Operative ${String(opId).slice(0, 8)}…`;
                      const canRemove = isSubcontractor && a.companyId === myCompanyId;
                      return (
                        <li
                          key={a.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 text-sm text-gray-700 dark:text-slate-300"
                        >
                          <span>{name}</span>
                          {canRemove && (
                            <button
                              type="button"
                              onClick={() => opId && handleRemoveSubOperative(opId)}
                              disabled={removingId === opId}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 p-1 rounded"
                              title="Remove from site"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

    </div>
  );
}
