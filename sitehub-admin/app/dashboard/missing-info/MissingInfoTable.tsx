"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, Download } from "lucide-react";

type Row = {
  userId: string;
  name: string;
  email: string;
  role: string | null;
  companyId: string | null;
  missingEmergencyContact: boolean;
  missingMedicalInfo: boolean;
};

export default function MissingInfoTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "emergency" | "medical" | "both">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/missing-info", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Row[];
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (q && !(r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q))) return false;
    if (filter === "emergency" && !r.missingEmergencyContact) return false;
    if (filter === "medical" && !r.missingMedicalInfo) return false;
    if (filter === "both" && !(r.missingEmergencyContact && r.missingMedicalInfo)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All missing info</option>
            <option value="emergency">Missing emergency contact only</option>
            <option value="medical">Missing medical info only</option>
            <option value="both">Missing both</option>
          </select>
        </div>
        <a
          href="/api/admin/missing-info?format=csv"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Download className="w-4 h-4" /> Export CSV
        </a>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 py-16 justify-center text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            {rows.length === 0
              ? "Everyone in your company has their emergency contact and medical info filled in. Nothing to chase."
              : "No workers match the current filter."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Worker</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Missing</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.userId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.name || "—"}</div>
                    <div className="text-xs text-gray-500">{r.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.role ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {r.missingEmergencyContact && (
                        <span className="inline-flex rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs">
                          Emergency contact
                        </span>
                      )}
                      {r.missingMedicalInfo && (
                        <span className="inline-flex rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs">
                          Medical info
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/users/${r.userId}/my-info`}
                      className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Fill in
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="text-xs text-gray-500 text-right">
          {filtered.length} of {rows.length} worker{rows.length === 1 ? "" : "s"} shown
        </div>
      )}
    </div>
  );
}
