"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";
import TableActions from "../components/ui/TableActions";
import jsPDF from "jspdf";
import { updateDeliveryStatus, deleteDelivery } from "./actions";

interface Delivery {
  id: string;
  reference?: string;
  siteId?: string;
  site?: string;
  status?: string;
  scheduledAt?: string;
  createdAt?: { toDate?: () => Date } | Date | string;
  notes?: string;
  podUrl?: string;
  loadUrl?: string;
  wholesaler?: string;
  [key: string]: unknown;
}

interface DeliveriesTableProps {
  data: Delivery[];
}

export default function DeliveriesTable({ data }: DeliveriesTableProps) {
  const [rows, setRows] = useState<Delivery[]>(data || []);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setRows(data || []);
  }, [data]);

  const fetchDeliveries = React.useCallback(() => {
    fetch("/api/deliveries", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (Array.isArray(list)) setRows(list);
      })
      .catch(() => {});
  }, []);

  // Fetch from API (uses company_id cookie for access control)
  useEffect(() => {
    let cancelled = false;
    fetchDeliveries();
    const interval = setInterval(() => {
      if (!cancelled) fetchDeliveries();
    }, 15000);
    const onFocus = () => {
      if (!cancelled) fetchDeliveries();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchDeliveries]);

  async function handleStatus(id: string, status: string) {
    await updateDeliveryStatus(id, status);
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this delivery?")) return;
    await deleteDelivery(id);
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  function formatDate(d: Delivery): string {
    const raw = d.scheduledAt ?? d.createdAt;
    if (!raw) return "";
    if (typeof raw === "string") return raw.slice(0, 16).replace("T", " ");
    if (raw && typeof raw === "object" && "toDate" in raw && typeof (raw as { toDate: () => Date }).toDate === "function") {
      const dt = (raw as { toDate: () => Date }).toDate();
      return dt.toISOString().slice(0, 16).replace("T", " ");
    }
    if (raw instanceof Date) return raw.toISOString().slice(0, 16).replace("T", " ");
    // Legacy timestamp: { seconds, nanoseconds } or { _seconds, _nanoseconds }
    const obj = raw as { seconds?: number; nanoseconds?: number; _seconds?: number; _nanoseconds?: number };
    const sec = obj.seconds ?? obj._seconds;
    if (typeof sec === "number") return new Date(sec * 1000).toISOString().slice(0, 16).replace("T", " ");
    return "";
  }

  function handleExportCSV() {
    if (!rows.length) return;

    const header = "Reference,Site,Date,Status,Notes\n";
    const body = rows
      .map((r) => {
        const ref = (r.reference || r.wholesaler || "").toString().replace(/"/g, '""');
        const site = (r.site || r.siteId || "").toString().replace(/"/g, '""');
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
  }

  function handleExportPDF() {
    if (!rows.length) return;

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Deliveries", 14, 16);
    doc.setFontSize(10);

    let y = 26;
    const lineHeight = 7;

    rows.forEach((r, index: number) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      const line = `${index + 1}. ${r.reference || r.wholesaler || "(no ref)"}  •  ${r.site || r.siteId || "-"}  •  ${formatDate(r) || "-"}  •  ${r.status || ""}`;
      doc.text(line, 14, y);
      y += lineHeight;
    });

    doc.save(`deliveries-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  const filteredRows = React.useMemo(() => {
    if (!dateFrom && !dateTo) return rows;
    return rows.filter((r) => {
      const raw = r.scheduledAt ?? r.createdAt;
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
        <Link href={`/dashboard/deliveries/${row.id}`} className="text-blue-600 hover:underline">
          {row.reference || row.wholesaler || row.id?.slice(0, 8) || "—"}
        </Link>
      ),
    },
    { header: "Site", accessor: "site", render: (row: Delivery) => (row.site || row.siteId || "—") },
    { header: "Date", accessor: "date", render: (row: Delivery) => formatDate(row) || "—" },
    {
      header: "Images",
      accessor: "images",
      render: (row: Delivery) => {
        const urls = [row.podUrl, row.loadUrl].filter(Boolean);
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
                {row.podUrl && row.loadUrl ? (i === 0 ? "POD" : "Load") : "View"}
              </a>
            ))}
          </span>
        );
      },
    },
    { header: "Notes", accessor: "notes", render: (row: Delivery) => (row.notes ? String(row.notes).slice(0, 40) + (String(row.notes).length > 40 ? "…" : "") : "—") },
    { header: "Status", accessor: "status", render: (row: Delivery) => row.status || "—" },
    {
      header: "Actions",
      accessor: "actions",
      render: (row: Delivery) => (
        <TableActions
          items={[
            { label: "Mark received", onClick: () => handleStatus(row.id, "RECEIVED") },
            { label: "Delete delivery", onClick: () => handleDelete(row.id), variant: "danger" },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">All Deliveries</h3>
            <p className="text-sm text-slate-600">{rows.length} deliveries tracked</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
          />
          <input
            type="date"
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
          />
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => fetchDeliveries()}
          >
            Refresh
          </Button>
          {rows.length > 0 && (
            <>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={handleExportCSV}
              >
                Export CSV
              </Button>
              <Button size="sm" type="button" onClick={handleExportPDF}>
                Export PDF
              </Button>
            </>
          )}
        </div>
      </div>
      <Table columns={columns} data={filteredRows} density="comfortable" />
    </div>
  );
}
