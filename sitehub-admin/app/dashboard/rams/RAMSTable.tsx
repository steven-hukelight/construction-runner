"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from "react";
import Link from "next/link";
import { FileText, Eye } from "lucide-react";
import Table from "../components/ui/Table";
import { StatusPill, statusToVariant } from "../components/ui/StatusPill";
import TableActions from "../components/ui/TableActions";
import { updateRAMSStatus, deleteRAMS } from "./actions";
import { openDocumentUrl } from "@/lib/openDocumentUrl";
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

export default function RAMSTable({ data }: any) {
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
  const { data: rows, mutate } = useSWR<any[]>(
    "/api/rams",
    fetcher,
    { fallbackData: Array.isArray(data) ? data : [], refreshInterval: 30000 }
  );

  const rowsSafe = rows ?? [];

  async function handleStatus(id: string, status: string) {
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

  const columns = [
    {
      header: "Title",
      accessor: "title",
      render: (row: any) => (
        <Link
          href={`/dashboard/health-and-safety/rams/${row.id}`}
          className="btn-ghost inline-flex items-center gap-1.5 no-underline"
        >
          <Eye size={14} />
          {row.title || "Untitled"}
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
      header: "Actions",
      accessor: "actions",
      render: (row: any) => {
        const docUrl = ramsFileUrl(row);
        return (
        <TableActions
          items={[
            ...(docUrl ? [{ label: "View file", onClick: () => openDocumentUrl(docUrl) }] : []),
            { label: "Approve", onClick: () => handleStatus(row.id, "APPROVED") },
            { label: "Reject", onClick: () => handleStatus(row.id, "REJECTED") },
            { label: "Delete", onClick: () => handleDelete(row.id), variant: "danger" as const },
          ]}
        />
        );
      },
    },
  ];

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">All RAMS Documents</h3>
          <p className="text-sm text-slate-600">{rowsSafe.length} documents uploaded</p>
        </div>
      </div>
      <Table columns={columns} data={rowsSafe} />
    </div>
  );
}
