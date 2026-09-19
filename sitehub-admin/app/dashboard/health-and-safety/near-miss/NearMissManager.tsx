"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, FileDown, Trash2, Eye } from "lucide-react";
import Table from "../../components/ui/Table";
import { DataTableShell } from "../../components/ui/TableChrome";
import { TaskStatusPill } from "../../components/ui/TaskStatusPill";
import { SafetyRecordCard } from "../../components/ui/SafetyRecordCard";
import { formatDate } from "@/app/DisplayPreferencesProvider";
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

  function fetchItems(showLoading = true) {
    const companyId = getCompanyIdFromClient();
    if (!companyId) {
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    fetch("/api/near-miss?unreviewed=false", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .finally(() => { if (showLoading) setLoading(false); });
  }

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchItems(false);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
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
      window.dispatchEvent(new Event("near-miss-reviewed"));
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, reviewed_at: new Date().toISOString(), status: "reviewed" } : i
        )
      );
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this near miss report? This cannot be undone.")) return;
    const res = await fetch(`/api/near-miss/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
    else alert("Delete failed. Please try again.");
  }

  const columns = [
    { header: "Description", accessor: "description", render: (r: NearMissItem) => (r.description || "").slice(0, 80) + ((r.description?.length ?? 0) > 80 ? "…" : "") },
    { header: "Site", accessor: "site_name", render: (r: NearMissItem) => r.site_name ?? r.site_id ?? "—" },
    {
      header: "Status",
      accessor: "status",
      render: (row: NearMissItem) => (
        <TaskStatusPill status={row.reviewed_at ? "reviewed" : "pending"} />
      ),
    },
    {
      header: "Date",
      accessor: "created_at",
      type: "date" as const,
      render: (row: NearMissItem) =>
        row.created_at ? formatDate(row.created_at) : "—",
    },
    {
      header: "Actions",
      render: (row: NearMissItem) => (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/health-and-safety/near-miss/${row.id}`}
            className="table-link inline-flex items-center gap-1.5"
          >
            <Eye size={14} />
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
          <button
            onClick={() => handleDelete(row.id)}
            className="text-red-600 hover:underline text-sm inline-flex items-center gap-1"
            title="Delete report"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTableShell
      title="Near miss reports"
      subtitle="Operative-submitted safety incidents for review."
    >
      {loading ? (
        <div className="p-6 text-sm text-slate-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">No near miss reports yet.</div>
      ) : (
        <>
          <div className="space-y-3 p-4 md:hidden">
            {items.map((row) => (
              <SafetyRecordCard
                key={row.id}
                icon={AlertTriangle}
                accent={row.reviewed_at ? "emerald" : "amber"}
                title={(row.description || "Untitled").slice(0, 90)}
                badges={<TaskStatusPill status={row.reviewed_at ? "reviewed" : "pending"} />}
                meta={[
                  row.site_name ?? row.site_id ?? "No site",
                  row.created_at ? formatDate(row.created_at) : "",
                ].filter(Boolean)}
                actions={
                  <>
                    <Link
                      href={`/dashboard/health-and-safety/near-miss/${row.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                    <button type="button" onClick={() => exportReport(row.id)} className="text-sm text-slate-600 hover:underline">
                      Export
                    </button>
                    {!row.reviewed_at ? (
                      <button type="button" onClick={() => markReviewed(row.id)} className="text-sm text-amber-700 hover:underline">
                        Mark reviewed
                      </button>
                    ) : null}
                    <button type="button" onClick={() => handleDelete(row.id)} className="text-sm text-red-600 hover:underline">
                      Delete
                    </button>
                  </>
                }
              />
            ))}
          </div>
          <div className="hidden md:block">
            <Table embedded columns={columns} data={items} />
          </div>
        </>
      )}
    </DataTableShell>
  );
}
