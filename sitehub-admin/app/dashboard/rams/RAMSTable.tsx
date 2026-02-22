"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import Table from "../components/ui/Table";
import TableActions from "../components/ui/TableActions";
import { updateRAMSStatus, deleteRAMS } from "./actions";
import { useCompanyName } from "@/lib/hooks/useCompanyName";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";

function CompanyNameCell({ companyId }: { companyId: string }) {
  const name = useCompanyName(companyId);
  return <>{name ?? "—"}</>;
}

export default function RAMSTable({ data }: any) {
  const [rows, setRows] = useState<any[]>(data || []);

  useEffect(() => {
    setRows(data || []);
  }, [data]);

  // Load RAMS from API (so main contractors see own + subcontractor RAMS for their sites)
  useEffect(() => {
    const companyId = getCompanyIdFromClient();
    if (!companyId) return;
    let cancelled = false;
    fetch("/api/rams", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setRows(data);
      });
    const interval = setInterval(() => {
      fetch("/api/rams", { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data)) setRows(data);
        });
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function handleStatus(id: string, status: string) {
    await updateRAMSStatus(id, status);
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, status } : row))
    );
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this RAMS?")) return;
    await deleteRAMS(id);
    setRows((prev) => prev.filter((row) => row.id !== id));
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
      render: (row: any) => (row.companyId ? <CompanyNameCell companyId={row.companyId} /> : "—"),
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
            ...(row.fileUrl ? [{ label: "View file", onClick: () => window.open(row.fileUrl, "_blank") }] : []),
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
        <div className="p-2 rounded-lg bg-blue-100">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">All RAMS Documents</h3>
          <p className="text-sm text-slate-600">{rows.length} documents uploaded</p>
        </div>
      </div>
      <Table columns={columns} data={rows} density="comfortable" />
    </div>
  );
}
