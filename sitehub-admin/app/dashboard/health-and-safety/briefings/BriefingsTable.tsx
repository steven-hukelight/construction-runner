"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import Table from "../../components/ui/Table";
import TableActions from "../../components/ui/TableActions";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";
import { useCompanyName } from "@/lib/hooks/useCompanyName";

function CompanyNameCell({ companyId }: { companyId: string }) {
  const name = useCompanyName(companyId);
  return <>{name ?? "—"}</>;
}

export default function BriefingsTable({
  data,
}: {
  data: Array<{
    id: string;
    title?: string;
    siteId?: string | null;
    companyId?: string;
    fileUrl?: string;
    createdAt?: unknown;
  }>;
}) {
  const [rows, setRows] = useState(data || []);

  useEffect(() => {
    setRows(data || []);
  }, [data]);

  useEffect(() => {
    const companyId = getCompanyIdFromClient();
    if (!companyId) return;
    let cancelled = false;
    fetch("/api/briefings", { credentials: "include" })
      .then((r) => r.json())
      .then((list) => {
        if (!cancelled && Array.isArray(list)) setRows(list);
      });
    const interval = setInterval(() => {
      fetch("/api/briefings", { credentials: "include" })
        .then((r) => r.json())
        .then((list) => {
          if (!cancelled && Array.isArray(list)) setRows(list);
        });
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this briefing?")) return;
    const res = await fetch(`/api/briefings/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const columns = [
    { header: "Title", accessor: "title" },
    {
      header: "Site",
      accessor: "siteId",
      render: (row: { siteId?: string | null }) => row.siteId || "All sites",
    },
    {
      header: "Company",
      accessor: "companyId",
      render: (row: { companyId?: string }) =>
        row.companyId ? <CompanyNameCell companyId={row.companyId} /> : "—",
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row: { id: string; fileUrl?: string }) => (
        <TableActions
          items={[
            ...(row.fileUrl
              ? [{ label: "View PDF", onClick: () => window.open(row.fileUrl, "_blank") }]
              : []),
            { label: "Delete", onClick: () => handleDelete(row.id), variant: "danger" as const },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-blue-100">
          <MessageSquare className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Toolbox Talks & Briefings</h3>
          <p className="text-sm text-slate-600">
            {rows.length} briefing{rows.length !== 1 ? "s" : ""}. Operatives acknowledge in the app.
          </p>
        </div>
      </div>
      <Table columns={columns} data={rows} density="comfortable" />
    </div>
  );
}
