"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from "react";
import Link from "next/link";
import { Bell, Check, FileText, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import Table from "../components/ui/Table";
import { TableNameCell } from "../components/ui/TableChrome";
import { StatusPill, statusToVariant } from "../components/ui/StatusPill";
import TableActions from "../components/ui/TableActions";
import { updateRAMSStatus, deleteRAMS } from "./actions";
import { openDocumentUrl } from "@/lib/openDocumentUrl";
import { postDocumentRemind } from "@/lib/documentRemindToast";
import { isReviewOverdue, reviewDateForDisplay } from "@/lib/ramsReviewDate";
import { formatDate, formatTime } from "@/app/DisplayPreferencesProvider";
import { useClientSession } from "../components/ClientSessionProvider";
import useSWR from "swr";

function ramsFileUrl(row: Record<string, unknown>): string | null {
  const u = row.url ?? row.file_url ?? row.fileUrl;
  return typeof u === "string" && u.trim() ? u : null;
}

function rowSiteId(row: Record<string, unknown>): string | null {
  const s = row.site_id ?? row.siteId;
  return typeof s === "string" && s ? s : null;
}

function rowCompanyId(row: Record<string, unknown>): string | null {
  const c = row.company_id ?? row.companyId;
  return typeof c === "string" && c ? c : null;
}

export default function RAMSTable({
  data,
  canViewAcknowledgements = false,
  companyId: companyIdFromServer,
}: {
  data: any;
  canViewAcknowledgements?: boolean;
  companyId?: string | null;
}) {
  const { companyId: sessionCompanyId } = useClientSession();
  const companyId = companyIdFromServer ?? sessionCompanyId;
  const fetcher = (url: string) =>
    fetch(url, { cache: "no-store", credentials: "include" }).then((r) =>
      r.ok ? r.json() : []
    );

  const { data: companies = [] } = useSWR(
    "/api/companies",
    fetcher,
    { revalidateOnFocus: false }
  );
  const { data: sites = [] } = useSWR(
    "/api/sites",
    fetcher,
    { revalidateOnFocus: false }
  );
  const companyMap = useMemo(() => {
    const m: Record<string, string> = {};
    (companies as { id?: string; name?: string }[]).forEach((c) => {
      if (c?.id && c?.name) m[String(c.id)] = String(c.name);
    });
    return m;
  }, [companies]);
  const siteMap = useMemo(() => {
    const m: Record<string, string> = {};
    (sites as { id?: string; name?: string }[]).forEach((s) => {
      if (s?.id && s?.name) m[String(s.id)] = String(s.name);
    });
    return m;
  }, [sites]);

  // Refresh RAMS on an interval; cookies send company / session context.
  const { data: rows, error: ramsError, isLoading, mutate } = useSWR<any[]>(
    "/api/rams",
    fetcher,
    { fallbackData: Array.isArray(data) ? data : [], refreshInterval: 30000 }
  );

  const rowsSafe = rows ?? [];

  const { data: ackCountsPayload, mutate: mutateAckCounts } = useSWR(
    companyId && canViewAcknowledgements
      ? `/api/rams/ack-counts?companyId=${encodeURIComponent(companyId)}`
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

  async function handleStatus(id: string, status: string) {
    const verb = status === "APPROVED" ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${verb} this RAMS?`)) return;
    await updateRAMSStatus(id, status);
    mutate((prev) =>
      (prev ?? []).map((row) => (row.id === id ? { ...row, status } : row)),
      false
    );
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this RAMS?")) return;
    await deleteRAMS(id);
    mutate((prev) => (prev ?? []).filter((row) => row.id !== id), false);
  }

  async function handleRemind(id: string, title: string | undefined) {
    const pending = outstanding[id] ?? Math.max(0, (ackTotals[id] ?? 0) - (ackCounts[id] ?? 0));
    if (pending <= 0) {
      toast("Everyone assigned has already acknowledged this RAMS.");
      return;
    }
    if (!companyId) return;
    if (!window.confirm(`Remind ${pending} ${pending === 1 ? "person" : "people"} who have not signed${title ? ` “${title}”` : ""}?`)) {
      return;
    }
    const result = await postDocumentRemind("rams", id, companyId);
    if (result.ok) {
      toast.success(result.message);
      await mutateAckCounts();
    } else {
      toast.error(result.message);
    }
  }

  function reviewCell(row: any) {
    const raw = row.review_date ?? row.reviewDate ?? null;
    const display = reviewDateForDisplay(raw);
    if (!display) return <span className="text-slate-400">—</span>;
    const overdue = isReviewOverdue(typeof raw === "string" ? raw : null);
    return (
      <div className="flex flex-col gap-1">
        <span>{formatDate(display)}</span>
        {overdue ? <span className="status-chip status-chip--danger w-fit">Overdue</span> : null}
      </div>
    );
  }

  const columns = [
    {
      header: "Title",
      accessor: "title",
      render: (row: any) => (
        <Link href={`/dashboard/health-and-safety/rams/${row.id}`} className="table-link">
          <TableNameCell icon={FileText} label={row.title || "Untitled"} />
        </Link>
      ),
    },
    {
      header: "Site",
      accessor: "site_id",
      render: (row: any) => {
        const sid = rowSiteId(row);
        if (!sid) return "—";
        return siteMap[sid] ?? sid;
      },
    },
    {
      header: "Company",
      accessor: "company_id",
      render: (row: any) => {
        const cid = rowCompanyId(row);
        return cid ? (companyMap[cid] ?? "—") : "—";
      },
    },
    {
      header: "Status",
      accessor: "status",
      render: (row: any) => (
        <StatusPill status={statusToVariant(row.status)} label={row.status || "—"} />
      ),
    },
    {
      header: "Review",
      accessor: "review_date",
      render: (row: any) => reviewCell(row),
    },
    ...(canViewAcknowledgements
      ? [
          {
            header: "Signed",
            accessor: "ackCount",
            render: (row: { id: string }) => {
              const acked = ackCounts[row.id] ?? 0;
              const total = ackTotals[row.id] ?? 0;
              const label = total > 0 ? `${acked} of ${total} on site` : `${acked} signed`;
              const remindedAt = lastReminded[row.id];
              return (
                <div className="flex flex-col">
                  <span className="tabular-nums text-slate-700 dark:text-slate-300">{label}</span>
                  {remindedAt ? (
                    <span className="text-xs text-slate-500">Reminded {formatTime(remindedAt)}</span>
                  ) : null}
                </div>
              );
            },
          },
        ]
      : []),
    {
      header: "Actions",
      accessor: "actions",
      render: (row: any) => {
        const docUrl = ramsFileUrl(row);
        const pending = outstanding[row.id] ?? Math.max(0, (ackTotals[row.id] ?? 0) - (ackCounts[row.id] ?? 0));
        const status = String(row.status ?? "").toUpperCase();
        const rejected = status === "REJECTED";
        return (
        <TableActions
          items={[
            ...(docUrl ? [{ label: "View file", icon: FileText, onClick: () => openDocumentUrl(docUrl) }] : []),
            ...(canViewAcknowledgements && pending > 0 && !rejected
              ? [{ label: "Remind outstanding", icon: Bell, onClick: () => void handleRemind(row.id, row.title) }]
              : []),
            ...(status !== "APPROVED"
              ? [{ label: "Approve", icon: Check, onClick: () => handleStatus(row.id, "APPROVED") }]
              : []),
            ...(status !== "REJECTED"
              ? [{ label: "Reject", icon: X, onClick: () => handleStatus(row.id, "REJECTED") }]
              : []),
            { label: "Delete", icon: Trash2, onClick: () => handleDelete(row.id), variant: "danger" as const },
          ]}
        />
        );
      },
    },
  ];

  return (
    <Table
      title="All RAMS documents"
      subtitle={`${rowsSafe.length} document${rowsSafe.length === 1 ? "" : "s"} uploaded`}
      columns={columns}
      data={rowsSafe}
      loading={isLoading && rowsSafe.length === 0}
      error={Boolean(ramsError) && rowsSafe.length === 0}
      onRetry={() => {
        void mutate();
      }}
      thing="RAMS"
      things="RAMS"
    />
  );
}
