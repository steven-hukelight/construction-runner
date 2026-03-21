"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import Table from "../components/ui/Table";
import TableActions from "../components/ui/TableActions";
import { updateRAMSStatus, deleteRAMS } from "./actions";
import { openDocumentUrl } from "@/lib/openDocumentUrl";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";
import useSWR from "swr";

export default function RAMSTable({ data }: any) {
  const companyId = getCompanyIdFromClient();
  const fetcher = (url: string) =>
    fetch(url, { cache: "no-store", credentials: "include" }).then((r) =>
      r.ok ? r.json() : []
    );

  const { data: companies = [] } = useSWR(
    "/api/companies",
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

  // Use SWR to refresh RAMS for own + subcontractor sites; fallback to server data.
  const { data: rows, mutate } = useSWR<any[]>(
    companyId ? "/api/rams" : null,
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
        <Link href={`/dashboard/health-and-safety/rams/${row.id}`} className="text-blue-600 hover:underline">
          {row.title || "Untitled"}
        </Link>
      ),
    },
    { header: "Site", accessor: "siteId" },
    {
      header: "Company",
      accessor: "companyId",
      render: (row: any) => (row.companyId ? (companyMap[row.companyId] ?? "—") : "—"),
    },
    {
      header: "Status",
      accessor: "status",
      render: (row: any) => (
        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-800">
          {row.status || "—"}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row: any) => (
        <TableActions
          items={[
            ...(row.fileUrl ? [{ label: "View file", onClick: () => openDocumentUrl(row.fileUrl!) }] : []),
            { label: "Approve", onClick: () => handleStatus(row.id, "APPROVED") },
            { label: "Reject", onClick: () => handleStatus(row.id, "REJECTED") },
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
