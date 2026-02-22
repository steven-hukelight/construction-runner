"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FileDown } from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Table from "../../components/ui/Table";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";
import Link from "next/link";

type NearMissItem = {
  id: string;
  description?: string;
  status?: string;
  site_id?: string | null;
  site_name?: string | null;
  operative_id?: string | null;
  reviewed_at?: string | null;
  attachments?: unknown[];
  created_at?: string;
};

export default function NearMissManager() {
  const [items, setItems] = useState<NearMissItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const companyId = getCompanyIdFromClient();
    if (!companyId) {
      setLoading(false);
      return;
    }
    fetch("/api/near-miss?unreviewed=false", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  async function exportReport(id: string) {
    try {
      const res = await fetch(`/api/near-miss/${id}/export`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `near-miss-report-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
      alert("Export failed. Please try again.");
    }
  }

  async function markReviewed(id: string) {
    const res = await fetch(`/api/near-miss/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewedAt: new Date().toISOString() }),
      credentials: "include",
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, reviewed_at: new Date().toISOString(), status: "reviewed" } : i
        )
      );
    }
  }

  const columns = [
    { header: "Description", accessor: "description", render: (r: NearMissItem) => (r.description || "").slice(0, 80) + ((r.description?.length ?? 0) > 80 ? "…" : "") },
    { header: "Site", accessor: "site_name", render: (r: NearMissItem) => r.site_name ?? r.site_id ?? "—" },
    {
      header: "Status",
      accessor: "status",
      render: (row: NearMissItem) => (
        <span
          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
            row.reviewed_at ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {row.reviewed_at ? "Reviewed" : "Pending"}
        </span>
      ),
    },
    {
      header: "Date",
      accessor: "created_at",
      render: (row: NearMissItem) =>
        row.created_at ? new Date(row.created_at).toLocaleDateString("en-GB") : "—",
    },
    {
      header: "Actions",
      render: (row: NearMissItem) => (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/health-and-safety/near-miss/${row.id}`}
            className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1"
          >
            View
          </Link>
          <button
            onClick={() => exportReport(row.id)}
            className="text-slate-600 hover:underline text-sm inline-flex items-center gap-1"
            title="Export report (PDF)"
          >
            <FileDown size={14} />
            Export
          </button>
          {!row.reviewed_at && (
            <button
              onClick={() => markReviewed(row.id)}
              className="text-amber-600 hover:underline text-sm"
            >
              Mark reviewed
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-amber-100">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Near Miss Reports</h3>
          <p className="text-sm text-slate-600">Operative-submitted safety incidents for review.</p>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-sm text-gray-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="p-6 text-sm text-gray-500">No near miss reports yet.</div>
      ) : (
        <Table columns={columns} data={items} density="comfortable" />
      )}
    </div>
  );
}
