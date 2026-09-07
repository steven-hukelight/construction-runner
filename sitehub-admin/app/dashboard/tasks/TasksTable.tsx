"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ListTodo } from "lucide-react";
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";
import TableActions from "../components/ui/TableActions";
import { TaskStatusPill } from "../components/ui/TaskStatusPill";
import TaskDetailModal from "./TaskDetailModal";
import { formatDate } from "@/app/DisplayPreferencesProvider";
import { updateTaskStatus, deleteTask } from "./actions";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";

export default function TasksTable({ data, refreshTrigger }: { data?: any; refreshTrigger?: number }) {
  const [rows, setRows] = useState<any[]>(data || []);
  const [users, setUsers] = useState<any[]>([]);
  const [detailTask, setDetailTask] = useState<any | null>(null);

  useEffect(() => {
    setRows(data || []);
  }, [data]);

  const refetchTasks = React.useCallback(async () => {
    const companyId = getCompanyIdFromClient();
    if (!companyId) return;
    const url = `/api/tasks?companyId=${encodeURIComponent(companyId)}&_t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store", credentials: "include" });
    if (!res.ok) return;
    const json = await res.json();
    setRows(Array.isArray(json) ? json : []);
  }, []);

  useEffect(() => {
    refetchTasks();
  }, [refetchTasks, refreshTrigger]);

  // Fallback: fetch users for name resolution (if API lacks assigned_to_names)
  useEffect(() => {
    const fetchUsers = async () => {
      const companyId = getCompanyIdFromClient();
      if (!companyId) return;
      const res = await fetch(`/api/users?companyId=${companyId}`, { credentials: "include" });
      if (!res.ok) return;
      const json = await res.json();
      setUsers(Array.isArray(json) ? json : []);
    };
    fetchUsers();
  }, []);

  const userMap = useMemo(() => {
    const m = new Map<string, any>();
    users.forEach((u: any) => m.set(String(u.id), u));
    return m;
  }, [users]);

  function resolveUser(uid: string | undefined): string {
    if (!uid) return "—";
    const u = userMap.get(String(uid));
    const name = u?.display_name ?? u?.name;
    if (name && String(name).trim()) return String(name);
    if (u?.email && String(u.email).includes("@")) return String(u.email).split("@")[0];
    return String(uid);
  }

  async function handleStatus(id: string, status: string) {
    await updateTaskStatus(id, status);
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    await deleteTask(id);
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  function handleExportCSV() {
    if (!rows.length) return;

    const header = "Title,Site,Assigned To,Due Date,Status\n";
    const body = rows
      .map((r) => {
        const title = (r.title || "").toString().replace(/"/g, '""');
        const site = (r.site_name ?? r.site_id ?? r.siteId ?? "").toString().replace(/"/g, '""');
        const assigned = Array.isArray(r.assigned_to_names)
          ? r.assigned_to_names.join(", ")
          : (r.assigned_to ?? r.assignedTo ?? "").toString();
        const assignedEsc = assigned.replace(/"/g, '""');
        const due = (r.due_date ?? r.dueDate ?? "").toString().replace(/"/g, '""');
        const status = (r.status || "").toString().replace(/"/g, '""');
        return `"${title}","${site}","${assignedEsc}","${due}","${status}"`;
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
      `tasks-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleExportPDF() {
    if (!rows.length) return;

    // Dynamic import to reduce bundle size
    const { default: jsPDF } = await import('jspdf');
    
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Tasks", 14, 16);
    doc.setFontSize(10);

    let y = 26;
    const lineHeight = 7;

    rows.forEach((r: any, index: number) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      const assigned = Array.isArray(r.assigned_to_names)
        ? r.assigned_to_names.join(", ")
        : (r.assigned_to ?? r.assignedTo ?? "-");
      const site = r.site_name ?? r.site_id ?? r.siteId ?? "-";
      const line = `${index + 1}. ${r.title || "(no title)"}  •  ${site}  •  ${assigned}  •  ${r.due_date ?? r.dueDate ?? ""}  •  ${r.status || ""}`;
      doc.text(line, 14, y);
      y += lineHeight;
    });

    doc.save(`tasks-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  const columns = [
    {
      header: "Title",
      accessor: "title",
      render: (row: any) => (
        <button
          type="button"
          onClick={() => setDetailTask(row)}
          className="text-left font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          {row.title || "Untitled"}
        </button>
      ),
    },
    {
      header: "Site",
      accessor: "site_name",
      render: (row: any) => row.site_name ?? row.site_id ?? row.siteId ?? "—",
    },
    {
      header: "Assigned To",
      accessor: "assigned_to",
      render: (row: any) => {
        if (Array.isArray(row.assigned_to_names) && row.assigned_to_names.length > 0) {
          return row.assigned_to_names.join(", ");
        }
        const ids = row.assigned_to_ids ?? (row.assigned_to ? [row.assigned_to] : row.assignedTo ? [row.assignedTo] : []);
        if (!ids.length) return "—";
        return ids.map((id: string) => resolveUser(id)).join(", ");
      },
    },
    {
      header: "Due Date",
      accessor: "due_date",
      type: "date",
      render: (row: any) => {
        const v = row.due_date ?? row.dueDate;
        if (!v) return "—";
        // Supabase DATE often arrives as "YYYY-MM-DD" (no timezone). Using new Date("YYYY-MM-DD")
        // can shift by a day in some timezones, so parse date-only values explicitly.
        let d: Date | null = null;
        if (typeof v === "string") {
          const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (m) {
            const year = Number(m[1]);
            const month = Number(m[2]);
            const day = Number(m[3]);
            d = new Date(year, month - 1, day);
          } else {
            const parsed = new Date(v);
            d = Number.isNaN(parsed.getTime()) ? null : parsed;
          }
        } else if (v instanceof Date) {
          d = v;
        }
        return d ? formatDate(d) : "—";
      },
    },
    {
      header: "Status",
      accessor: "status",
      render: (row: any) => <TaskStatusPill status={row.status} />,
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row: any) => (
        <TableActions
          items={[
            { label: "Set status → Open", onClick: () => handleStatus(row.id, "OPEN") },
            { label: "Set status → In progress", onClick: () => handleStatus(row.id, "IN_PROGRESS") },
            { label: "Set status → Done", onClick: () => handleStatus(row.id, "DONE") },
            { label: "Delete task", onClick: () => handleDelete(row.id), variant: "danger" },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
            <ListTodo className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">All Tasks</h3>
            <p className="text-sm text-slate-600">{rows.length} tasks assigned</p>
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
      <Table
        columns={columns}
        data={rows}
        emptyMessage="No tasks yet. Use Add Task above to create one."
      />
      {typeof document !== "undefined" &&
        detailTask &&
        createPortal(
          <TaskDetailModal
            task={detailTask}
            onClose={() => setDetailTask(null)}
            onStatusChange={(id, status) => {
              handleStatus(id, status);
              setDetailTask((t) => (t?.id === id ? { ...t, status } : t));
            }}
            onDelete={(id) => {
              handleDelete(id);
              setDetailTask(null);
            }}
          />,
          document.body
        )}
    </div>
  );
}
