"use client";

import { useEffect, useMemo, useState } from "react";
import { roleDisplayName } from "@/lib/auth/roles";
import {
  FACE_FIT_CHIP,
  FACE_FIT_LABEL,
  STATUS_CHIP,
  STATUS_LABEL,
  readError,
  ukDate,
  type FaceFitStatus,
  type TrainingStatus,
} from "./types";

type Matrix = {
  modules: { id: string; title: string; refreshMonths: number | null }[];
  people: {
    id: string;
    name: string;
    role: string;
    modules: Record<string, { status: TrainingStatus; dueAt: string | null; lastPassedAt: string | null; lastScore: number | null }>;
    faceFit: { status: FaceFitStatus; reviewDueAt: string | null; mask: string | null } | null;
  }[];
};

export default function PeoplePanel() {
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [onlyOutstanding, setOnlyOutstanding] = useState(false);

  useEffect(() => {
    fetch("/api/training-admin/people", { credentials: "include", cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(await readError(r, "Couldn't load people"));
        setMatrix((await r.json()) as Matrix);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const rows = useMemo(() => {
    if (!matrix) return [];
    const q = search.trim().toLowerCase();
    return matrix.people.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (!onlyOutstanding) return true;
      const moduleOutstanding = Object.values(p.modules).some((m) => m.status !== "passed");
      return moduleOutstanding || (p.faceFit != null && p.faceFit.status !== "current");
    });
  }, [matrix, search, onlyOutstanding]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!matrix) return <p className="text-sm text-slate-500">Loading…</p>;
  const showFaceFit = matrix.people.some((p) => p.faceFit != null);
  if (!matrix.modules.length && !showFaceFit) {
    return <p className="text-sm text-slate-500">No training is turned on yet. Turn a module on under Modules.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        />
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyOutstanding} onChange={(e) => setOnlyOutstanding(e.target.checked)} />
          Only people with something outstanding
        </label>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Person</th>
              {matrix.modules.map((m) => (
                <th key={m.id} className="px-4 py-2 font-medium whitespace-nowrap">
                  {m.title}
                </th>
              ))}
              {showFaceFit && <th className="px-4 py-2 font-medium">Face fit</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-2">
                  <div className="font-medium text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500">{roleDisplayName(p.role)}</div>
                </td>
                {matrix.modules.map((m) => {
                  const cell = p.modules[m.id];
                  if (!cell) return <td key={m.id} className="px-4 py-2">—</td>;
                  return (
                    <td key={m.id} className="px-4 py-2">
                      <span className={`status-chip ${STATUS_CHIP[cell.status]}`}>{STATUS_LABEL[cell.status]}</span>
                      {cell.lastPassedAt && <div className="mt-1 text-xs text-slate-500">Passed {ukDate(cell.lastPassedAt)}</div>}
                      {cell.dueAt && <div className="text-xs text-slate-400">Due {ukDate(cell.dueAt)}</div>}
                    </td>
                  );
                })}
                {showFaceFit && (
                  <td className="px-4 py-2">
                    {p.faceFit ? (
                      <>
                        <span className={`status-chip ${FACE_FIT_CHIP[p.faceFit.status]}`}>{FACE_FIT_LABEL[p.faceFit.status]}</span>
                        {p.faceFit.mask && <div className="mt-1 text-xs text-slate-500">{p.faceFit.mask}</div>}
                        {p.faceFit.reviewDueAt && <div className="text-xs text-slate-400">Review {ukDate(p.faceFit.reviewDueAt)}</div>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
