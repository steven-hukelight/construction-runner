"use client";

import { useMemo } from "react";
import { MessageSquare } from "lucide-react";
import { openDocumentUrl } from "@/lib/openDocumentUrl";
import Table from "../../components/ui/Table";
import TableActions from "../../components/ui/TableActions";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";
import useSWR from "swr";

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
  const companyId = useMemo(() => getCompanyIdFromClient(), []);

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
    companies.forEach((c: { id?: string; name?: string }) => {
      if (c?.id && c?.name) m[String(c.id)] = String(c.name);
    });
    return m;
  }, [companies]);

  const { data: rows = [], mutate } = useSWR(
    companyId ? `/api/briefings?companyId=${encodeURIComponent(companyId)}` : null,
    async (url: string) => {
      const res = await fetch(url, { cache: "no-store", credentials: "include" });
      if (!res.ok) return [] as typeof data;
      const list = await res.json();
      return Array.isArray(list) ? list : [];
    },
    {
      fallbackData: data || [],
      refreshInterval: 30000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this briefing?")) return;
    const res = await fetch(`/api/briefings/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) await mutate((prev) => prev?.filter((r) => r.id !== id) ?? [], false);
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
        row.companyId ? (companyMap[row.companyId] ?? "—") : "—",
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row: { id: string; fileUrl?: string }) => (
        <TableActions
          items={[
            ...(row.fileUrl
              ? [{ label: "View PDF", onClick: () => openDocumentUrl(row.fileUrl!) }]
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
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Toolbox Talks & Briefings</h3>
          <p className="text-sm text-slate-600">
            {rows.length} briefing{rows.length !== 1 ? "s" : ""}. Operatives acknowledge in the app.
          </p>
        </div>
      </div>
      <Table columns={columns} data={rows} />
    </div>
  );
}
