"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";
import TableActions from "../components/ui/TableActions";
import jsPDF from "jspdf";
import { deleteNotice } from "./actions";
import { useMemo } from "react";
import { getCompanyIdFromClient, getRoleFromClient } from "@/lib/utils/cookies";
import { fetchTable } from "@/lib/supabase/fetchTable";

export default function NoticesTable({ data }: any) {
  const [rows, setRows] = useState<any[]>(data || []);
  const [sites, setSites] = useState<any[]>([]);

  useEffect(() => {
    setRows(data || []);
  }, [data]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const role = getRoleFromClient();
      const companyId = getCompanyIdFromClient(); // UUID or null (cookie only)
      if (role !== "superuser" && !companyId) return;
      const [noticesRes, sitesRes] = await Promise.all([
        fetchTable("notices", role ?? undefined, companyId),
        fetchTable("sites", role ?? undefined, companyId),
      ]);
      if (!mounted) return;
      if (!noticesRes.error && noticesRes.data) setRows(noticesRes.data);
      if (!sitesRes.error && sitesRes.data) setSites(sitesRes.data);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const siteMap = useMemo(() => {
    const m = new Map<string, any>();
    sites.forEach((s: any) => m.set(String(s.id), s));
    return m;
  }, [sites]);

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this notice?")) return;
    await deleteNotice(id);
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  function handleExportCSV() {
    if (!rows.length) return;

    const header = "Title,Site,Created\n";
    const body = rows
      .map((r) => {
        const title = (r.title || "").toString().replace(/"/g, '""');
        const site = (r.site_id ?? r.siteId ?? "").toString().replace(/"/g, '""');
        const created = (r.created_at ?? r.createdAt ?? "").toString().replace(/"/g, '""'); // Supabase: created_at
        return `"${title}","${site}","${created}"`;
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
      `notices-${new Date().toISOString().slice(0, 10)}.csv`
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
    doc.text("Notices", 14, 16);
    doc.setFontSize(10);

    let y = 26;
    const lineHeight = 7;

    rows.forEach((r: any, index: number) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      const line = `${index + 1}. ${r.title || "(no title)"}  •  ${
        r.site_id ?? r.siteId ?? "-"
      }  •  ${r.created_at ?? r.createdAt ?? ""}`;
      doc.text(line, 14, y);
      y += lineHeight;
    });

    doc.save(`notices-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  const columns = [
    { header: "Title", accessor: "title" },
    {
      header: "Site",
      accessor: "site_id",
      render: (row: any) => {
        const sid = row.site_id ?? row.siteId ?? row.site?.id;
        if (sid) {
          const s = siteMap.get(String(sid));
          if (s?.name) return String(s.name);
        }
        return row.siteName ?? "—";
      },
    },
    {
      header: "Created",
      accessor: "created_at",
      render: (row: any) => {
        const v = row.created_at ?? row.createdAt;
        if (!v) return <span>—</span>;
        if (typeof v === "object" && (v._seconds != null || v.seconds != null)) {
          const sec = v._seconds ?? v.seconds;
          return <span>{new Date(sec * 1000).toLocaleString()}</span>;
        }
        const d = new Date(v);
        return <span>{!Number.isNaN(d.getTime()) ? d.toLocaleString() : "—"}</span>;
      },
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row: any) => (
        <TableActions
          items={[{ label: "Delete notice", onClick: () => handleDelete(row.id), variant: "danger" }]}
        />
      ),
    },
  ];

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Megaphone className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">All Notices</h3>
            <p className="text-sm text-slate-600">{rows.length} notices posted</p>
          </div>
        </div>
        {rows.length > 0 && (
          <div className="flex items-center gap-2">
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
          </div>
        )}
      </div>
      <Table columns={columns} data={rows} density="comfortable" />
    </div>
  );
}
