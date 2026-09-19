"use client";

import { useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { openDocumentUrl } from "@/lib/openDocumentUrl";
import Table from "../../components/ui/Table";
import { DataTableShell } from "../../components/ui/TableChrome";
import TableActions from "../../components/ui/TableActions";
import { SafetyRecordCard } from "../../components/ui/SafetyRecordCard";
import BriefingDetailModal from "./BriefingDetailModal";
import { useClientSession } from "../../components/ClientSessionProvider";
import useSWR from "swr";

export default function BriefingsTable({
  data,
  canViewAcknowledgements,
  companyId: companyIdFromServer,
}: {
  data: Array<{
    id: string;
    title?: string;
    siteId?: string | null;
    companyId?: string;
    fileUrl?: string;
    createdAt?: unknown;
  }>;
  /** From server cookies — must match SSR so table columns hydrate without mismatch. */
  canViewAcknowledgements: boolean;
  companyId?: string | null;
}) {
  const { companyId: sessionCompanyId } = useClientSession();
  const companyId = useMemo(
    () => companyIdFromServer ?? sessionCompanyId,
    [companyIdFromServer, sessionCompanyId]
  );

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

  const sitesUrl =
    companyId != null && companyId !== ""
      ? `/api/sites?companyId=${encodeURIComponent(companyId)}`
      : "/api/sites";

  const { data: sitesList = [] } = useSWR(
    companyId ? sitesUrl : null,
    async (url: string) => {
      const res = await fetch(url, { cache: "no-store", credentials: "include" });
      const list = await res.json();
      return Array.isArray(list) ? list : [];
    },
    { revalidateOnFocus: false }
  );

  const siteMap = useMemo(() => {
    const m: Record<string, string> = {};
    sitesList.forEach((s: { id?: string; name?: string }) => {
      if (s?.id) m[String(s.id)] = String(s.name ?? "").trim() || String(s.id);
    });
    return m;
  }, [sitesList]);

  const [detailBriefing, setDetailBriefing] = useState<typeof data[0] | null>(null);

  const { data: ackCountsPayload } = useSWR(
    companyId && canViewAcknowledgements
      ? `/api/briefings/ack-counts?companyId=${encodeURIComponent(companyId)}`
      : null,
    async (url: string) => {
      const res = await fetch(url, { cache: "no-store", credentials: "include" });
      if (!res.ok) return { counts: {} as Record<string, number> };
      return res.json() as Promise<{ counts?: Record<string, number> }>;
    },
    { revalidateOnFocus: false }
  );
  const ackCounts = ackCountsPayload?.counts ?? {};

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
    {
      header: "Title",
      accessor: "title",
      render: (row: { id: string; title?: string }) => (
        <button
          type="button"
          onClick={() => setDetailBriefing(row)}
          className="table-link text-left"
        >
          {row.title || "Untitled"}
        </button>
      ),
    },
    {
      header: "Site",
      accessor: "siteId",
      render: (row: { siteId?: string | null; site_id?: string | null }) => {
        const sid = (row.siteId ?? row.site_id ?? "").trim();
        if (!sid) return "All sites";
        return siteMap[sid] ?? sid;
      },
    },
    ...(canViewAcknowledgements
      ? [
          {
            header: "Acknowledged",
            accessor: "ackCount",
            render: (row: { id: string }) => (
              <span className="tabular-nums text-slate-700 dark:text-slate-300">
                {ackCounts[row.id] ?? 0}
              </span>
            ),
          },
        ]
      : []),
    {
      header: "Company",
      accessor: "companyId",
      render: (row: { companyId?: string; company_id?: string }) => {
        const cid = row.companyId ?? row.company_id;
        return cid ? (companyMap[String(cid)] ?? "—") : "—";
      },
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row: { id: string; fileUrl?: string; file_url?: string }) => {
        const pdf = row.fileUrl ?? row.file_url;
        return (
        <TableActions
          items={[
            ...(pdf
              ? [{ label: "View PDF", onClick: () => openDocumentUrl(pdf) }]
              : []),
            { label: "Delete", onClick: () => handleDelete(row.id), variant: "danger" as const },
          ]}
        />
        );
      },
    },
  ];

  return (
    <>
    <DataTableShell
      title="Toolbox talks & briefings"
      subtitle={`${rows.length} briefing${rows.length !== 1 ? "s" : ""}. Operatives acknowledge in the app.`}
    >
      <div className="space-y-3 p-4 md:hidden">
        {rows.map((row) => {
          const sid = String(row.siteId ?? "").trim();
          const pdf = row.fileUrl;
          return (
            <SafetyRecordCard
              key={row.id}
              icon={MessageSquare}
              accent="blue"
              title={row.title || "Untitled"}
              subtitle={sid ? siteMap[sid] ?? sid : "All sites"}
              meta={[
                canViewAcknowledgements ? `${ackCounts[row.id] ?? 0} acknowledged` : "",
              ].filter(Boolean)}
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => setDetailBriefing(row)}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    View
                  </button>
                  {pdf ? (
                    <button
                      type="button"
                      onClick={() => openDocumentUrl(pdf)}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      View PDF
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDelete(row.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </>
              }
            />
          );
        })}
      </div>
      <div className="hidden md:block">
        <Table embedded columns={columns} data={rows} />
      </div>
    </DataTableShell>
      {detailBriefing && (
        <BriefingDetailModal
          briefing={detailBriefing}
          companyId={companyId}
          canViewAcknowledgements={canViewAcknowledgements}
          onClose={() => setDetailBriefing(null)}
        />
      )}
    </>
  );
}
