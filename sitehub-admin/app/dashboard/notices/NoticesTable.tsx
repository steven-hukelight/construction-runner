"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useMemo } from "react";
import { Megaphone } from "lucide-react";
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";
import TableActions from "../components/ui/TableActions";
import { deleteNotice } from "./actions";
import { getCompanyIdFromClient, getRoleFromClient } from "@/lib/utils/cookies";
import { fetchTable } from "@/lib/supabase/fetchTable";
import useSWR from "swr";

export default function NoticesTable({ data }: any) {
  const role = getRoleFromClient();
  const companyId = getCompanyIdFromClient();

  const fetcher = async () => {
    if (role !== "superuser" && !companyId) return { notices: Array.isArray(data) ? data : [], sites: [] };
    const [noticesRes, sitesRes] = await Promise.all([
      fetchTable("notices", role ?? undefined, companyId),
      fetchTable("sites", role ?? undefined, companyId),
    ]);
    return {
      notices: !noticesRes.error && Array.isArray(noticesRes.data) ? noticesRes.data : Array.isArray(data) ? data : [],
      sites: !sitesRes.error && Array.isArray(sitesRes.data) ? sitesRes.data : [],
    };
  };

  const { data: payload, mutate } = useSWR<{ notices: any[]; sites: any[] }>(
    role !== null || companyId ? "notices-and-sites" : null,
    fetcher,
    { fallbackData: { notices: Array.isArray(data) ? data : [], sites: [] }, refreshInterval: 30000 }
  );

  const rows = payload?.notices ?? [];
  const sites = React.useMemo(() => payload?.sites ?? [], [payload?.sites]);

  const siteMap = useMemo(() => {
    const m = new Map<string, any>();
    sites.forEach((s: any) => m.set(String(s.id), s));
    return m;
  }, [sites]);

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this notice?")) return;
    await deleteNotice(id);
    mutate((prev) =>
      prev
        ? { ...prev, notices: prev.notices.filter((row) => row.id !== id) }
        : prev,
      false
    );
  }

  const handleExportCSV = useCallback(() => {
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
  }, [rows]);

  const handleExportPDF = useCallback(async () => {
    if (!rows.length) return;

    const { default: jsPDF } = await import("jspdf");
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
  }, [rows]);

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
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
            <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
      <Table columns={columns} data={rows} />
    </div>
  );
}
