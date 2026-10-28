"use client";

import { useMemo, useState } from "react";
import { Bell, FileText, MessageSquare, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { openDocumentUrl } from "@/lib/openDocumentUrl";
import { postDocumentRemind } from "@/lib/documentRemindToast";
import { formatTime } from "@/app/DisplayPreferencesProvider";
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
  /** From server cookies, must match SSR so table columns hydrate without mismatch. */
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

  const { data: ackCountsPayload, mutate: mutateAckCounts } = useSWR(
    companyId && canViewAcknowledgements
      ? `/api/briefings/ack-counts?companyId=${encodeURIComponent(companyId)}`
      : null,
    async (url: string) => {
      const res = await fetch(url, { cache: "no-store", credentials: "include" });
      if (!res.ok) {
        return {
          counts: {} as Record<string, number>,
          totals: {} as Record<string, number>,
          outstanding: {} as Record<string, number>,
          lastReminded: {} as Record<string, string>,
        };
      }
      return res.json() as Promise<{
        counts?: Record<string, number>;
        totals?: Record<string, number>;
        outstanding?: Record<string, number>;
        lastReminded?: Record<string, string>;
      }>;
    },
    { revalidateOnFocus: false }
  );
  const ackCounts = ackCountsPayload?.counts ?? {};
  const ackTotals = ackCountsPayload?.totals ?? {};
  const outstanding = ackCountsPayload?.outstanding ?? {};
  const lastReminded = ackCountsPayload?.lastReminded ?? {};

  function acknowledgedLabel(id: string): string {
    const acked = ackCounts[id] ?? 0;
    const total = ackTotals[id] ?? 0;
    if (total > 0) return `${acked} of ${total} on site`;
    return `${acked} acknowledged`;
  }

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

  async function handleRemind(id: string, title: string | undefined) {
    const pending = outstanding[id] ?? Math.max(0, (ackTotals[id] ?? 0) - (ackCounts[id] ?? 0));
    if (pending <= 0) {
      toast("Everyone assigned has already acknowledged this briefing.");
      return;
    }
    if (!companyId) return;
    if (!window.confirm(`Remind ${pending} ${pending === 1 ? "person" : "people"} who have not acknowledged${title ? ` “${title}”` : ""}?`)) {
      return;
    }
    const result = await postDocumentRemind("briefing", id, companyId);
    if (result.ok) {
      toast.success(result.message);
      await mutateAckCounts();
    } else {
      toast.error(result.message);
    }
  }

  function remindedLabel(id: string): string | null {
    const at = lastReminded[id];
    if (!at) return null;
    return `Reminded ${formatTime(at)}`;
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
              <div className="flex flex-col">
                <span className="tabular-nums text-slate-700 dark:text-slate-300">
                  {acknowledgedLabel(row.id)}
                </span>
                {remindedLabel(row.id) ? (
                  <span className="text-xs text-slate-500">{remindedLabel(row.id)}</span>
                ) : null}
              </div>
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
      render: (row: { id: string; title?: string; fileUrl?: string; file_url?: string }) => {
        const pdf = row.fileUrl ?? row.file_url;
        const pending = outstanding[row.id] ?? Math.max(0, (ackTotals[row.id] ?? 0) - (ackCounts[row.id] ?? 0));
        return (
        <TableActions
          items={[
            ...(pdf
              ? [{ label: "View PDF", icon: FileText, onClick: () => openDocumentUrl(pdf) }]
              : []),
            ...(canViewAcknowledgements && pending > 0
              ? [{ label: "Remind outstanding", icon: Bell, onClick: () => void handleRemind(row.id, row.title) }]
              : []),
            { label: "Delete", icon: Trash2, onClick: () => handleDelete(row.id), variant: "danger" as const },
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
                canViewAcknowledgements ? acknowledgedLabel(row.id) : "",
                canViewAcknowledgements ? remindedLabel(row.id) ?? "" : "",
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
                  {canViewAcknowledgements &&
                  (outstanding[row.id] ?? Math.max(0, (ackTotals[row.id] ?? 0) - (ackCounts[row.id] ?? 0))) > 0 ? (
                    <button
                      type="button"
                      onClick={() => void handleRemind(row.id, row.title)}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Remind
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
