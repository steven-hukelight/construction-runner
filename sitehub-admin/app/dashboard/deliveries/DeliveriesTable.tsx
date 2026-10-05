"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Package, Trash2 } from "lucide-react";
import Table from "../components/ui/Table";
import { TableNameCell } from "../components/ui/TableChrome";
import { TaskStatusPill } from "../components/ui/TaskStatusPill";
import Button from "../components/ui/Button";
import TableActions from "../components/ui/TableActions";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
import { updateDeliveryStatus, deleteDelivery } from "./actions";
import useSWR from "swr";

interface Delivery {
  id: string;
  reference?: string;
  siteId?: string;
  site_id?: string;
  site?: string;
  status?: string;
  scheduledAt?: string;
  scheduled_at?: string;
  createdAt?: { toDate?: () => Date } | Date | string;
  created_at?: { toDate?: () => Date } | Date | string;
  notes?: string;
  podUrl?: string;
  pod_url?: string;
  loadUrl?: string;
  load_url?: string;
  load_photos?: string[];
  wholesaler?: string;
  [key: string]: unknown;
}

interface DeliveriesTableProps {
  data: Delivery[];
}

export default function DeliveriesTable({ data }: DeliveriesTableProps) {
  const fetcher = useMemo(
    () =>
      async (url: string) => {
        const res = await fetch(url, { cache: "no-store", credentials: "include" });
        if (!res.ok) return [] as Delivery[];
        const list = await res.json();
        return Array.isArray(list) ? list : [];
      },
    []
  );

  const { data: rows = [], mutate } = useSWR<Delivery[]>("/api/deliveries", fetcher, {
    fallbackData: data || [],
    refreshInterval: 15000,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function handleStatus(id: string, status: string) {
    await updateDeliveryStatus(id, status);
    await mutate((prev) => prev?.map((row) => (row.id === id ? { ...row, status } : row)) ?? [], false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this delivery?")) return;
    await deleteDelivery(id);
    await mutate((prev) => prev?.filter((row) => row.id !== id) ?? [], false);
  }

  function formatDate(d: Delivery): string {
    const raw = d.scheduledAt ?? d.scheduled_at ?? d.createdAt ?? d.created_at;
    if (!raw) return "";
    let date: Date;
    if (typeof raw === "string") date = new Date(raw);
    else if (raw && typeof raw === "object" && "toDate" in raw && typeof (raw as { toDate: () => Date }).toDate === "function")
      date = (raw as { toDate: () => Date }).toDate();
    else if (raw instanceof Date) date = raw;
    else {
      const obj = raw as { seconds?: number; _seconds?: number };
      const sec = obj.seconds ?? obj._seconds;
      if (typeof sec !== "number") return "";
      date = new Date(sec * 1000);
    }
    return formatDateTime(date);
  }

  const handleExportCSV = useCallback(() => {
    if (!rows.length) return;

    const header = "Reference,Site,Date,Status,Notes\n";
    const body = rows
      .map((r) => {
        const ref = (r.reference || r.wholesaler || "").toString().replace(/"/g, '""');
        const site = (r.site || r.siteId || r.site_id || "").toString().replace(/"/g, '""');
        const date = formatDate(r).replace(/"/g, '""');
        const status = (r.status || "").toString().replace(/"/g, '""');
        const notes = (r.notes || "").toString().replace(/"/g, '""');
        return `"${ref}","${site}","${date}","${status}","${notes}"`;
      })
      .join("\n");

    const blob = new Blob([header + body], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `deliveries-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [rows]);

  const handleExportPDF = useCallback(async () => {
    if (!rows.length) return;

    const [{ createReportPdf }, branding] = await Promise.all([
      import("@/lib/pdf/createReportPdf"),
      import("@/lib/pdf/fetchPdfBrandingClient").then((m) =>
        m.fetchPdfBrandingClient(),
      ),
    ]);

    const report = createReportPdf({
      title: "Deliveries",
      metaLines: [`${rows.length} deliver${rows.length === 1 ? "y" : "ies"}`],
      branding,
      footerLabel: "Construction Runner, deliveries",
    });

    const { doc, margin } = report;
    rows.forEach((r, index: number) => {
      report.ensureSpace(12);
      let y = report.y;
      const ref = r.reference || r.wholesaler || "(no ref)";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(28, 32, 38);
      doc.text(`${index + 1}.  ${ref}`, margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 110, 124);
      doc.text(
        `${r.site || r.siteId || "—"}  ·  ${formatDate(r) || "—"}  ·  ${r.status || "—"}`,
        margin + 4,
        y,
      );
      report.setY(y + 7);
    });

    report.applyFooters();
    report.doc.save(`deliveries-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!dateFrom && !dateTo) return rows;
    return rows.filter((r) => {
      const raw = r.scheduledAt ?? r.scheduled_at ?? r.createdAt ?? r.created_at;
      if (!raw) return true;
      let ts: number;
      if (typeof raw === "string") ts = new Date(raw).getTime();
      else if (raw && typeof raw === "object" && "toDate" in raw && typeof (raw as { toDate: () => Date }).toDate === "function")
        ts = (raw as { toDate: () => Date }).toDate().getTime();
      else if (raw instanceof Date) ts = raw.getTime();
      else {
        const obj = raw as { seconds?: number; _seconds?: number };
        ts = (obj.seconds ?? obj._seconds ?? 0) * 1000;
      }
      if (dateFrom && ts < new Date(dateFrom).getTime()) return false;
      if (dateTo && ts > new Date(dateTo + "T23:59:59").getTime()) return false;
      return true;
    });
  }, [rows, dateFrom, dateTo]);

  const columns = [
    {
      header: "Reference",
      accessor: "reference",
      render: (row: Delivery) => (
        <Link href={`/dashboard/deliveries/${row.id}`} className="table-link">
          <TableNameCell icon={Package} label={row.reference || row.wholesaler || row.id?.slice(0, 8) || "—"} />
        </Link>
      ),
    },
    { header: "Site", accessor: "site", render: (row: Delivery) => (row.site || row.siteId || row.site_id || "—") },
    {
      header: "Date",
      accessor: "date",
      type: "date",
      render: (row: Delivery) => formatDate(row) || "—",
    },
    {
      header: "Images",
      accessor: "images",
      render: (row: Delivery) => {
        const urls = [
          row.podUrl ?? row.pod_url,
          ...(Array.isArray(row.load_photos) ? row.load_photos : []),
          row.loadUrl ?? row.load_url,
        ].filter((value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index);
        if (urls.length === 0) return "—";
        return (
          <span className="flex flex-wrap gap-1">
            {urls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs"
              >
                {i === 0 ? "POD" : `Load ${i}`}
              </a>
            ))}
          </span>
        );
      },
    },
    { header: "Notes", accessor: "notes", render: (row: Delivery) => (row.notes ? String(row.notes).slice(0, 40) + (String(row.notes).length > 40 ? "…" : "") : "—") },
    {
      header: "Status",
      accessor: "status",
      render: (row: Delivery) => <TaskStatusPill status={row.status} />,
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row: Delivery) => (
        <TableActions
          items={[
            { label: "Mark received", icon: Check, onClick: () => handleStatus(row.id, "RECEIVED") },
            { label: "Delete delivery", icon: Trash2, onClick: () => handleDelete(row.id), variant: "danger" },
          ]}
        />
      ),
    },
  ];

  return (
    <Table
      title="All deliveries"
      subtitle={`${rows.length} deliveries tracked`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            From
            <input
              type="date"
              className="table-toolbar-input cursor-pointer"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            To
            <input
              type="date"
              className="table-toolbar-input cursor-pointer"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
          <Button variant="secondary" size="sm" type="button" onClick={() => mutate()}>
            Refresh
          </Button>
          {rows.length > 0 && (
            <>
              <Button variant="secondary" size="sm" type="button" onClick={handleExportCSV}>
                Export CSV
              </Button>
              <Button size="sm" type="button" onClick={handleExportPDF}>
                Export PDF
              </Button>
            </>
          )}
        </div>
      }
      columns={columns}
      data={filteredRows}
    />
  );
}
