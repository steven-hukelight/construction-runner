"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { ListTodo } from "lucide-react";
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";
import TableActions from "../components/ui/TableActions";
import { updateTaskStatus, deleteTask } from "./actions";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";
import { supabase } from "@/supabase/auth/client";

export default function TasksTable({ data }: any) {
  const [rows, setRows] = useState<any[]>(data || []);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    setRows(data || []);
  }, [data]);

  // Fetch tasks from Supabase, filtered by company_id (UUID from cookie)
  useEffect(() => {
    const fetchTasks = async () => {
      const companyId = getCompanyIdFromClient(); // UUID from cookie
      if (!companyId) return;
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(150);
      if (!error && Array.isArray(data)) setRows(data);
      else setRows([]);
    };
    fetchTasks();
  }, []);

  // Fetch users for name resolution from Supabase
  useEffect(() => {
    const fetchUsers = async () => {
      const companyId = getCompanyIdFromClient(); // UUID from cookie
      if (!companyId) return;
      const { data, error } = await supabase
        .from("users")
        .select("id, display_name, email")
        .eq("company_id", companyId);
      if (!error && Array.isArray(data)) setUsers(data);
      else setUsers([]);
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
        const site = (r.site_id ?? r.siteId ?? "").toString().replace(/"/g, '""');
        const assigned = (r.assigned_to ?? r.assignedTo ?? "").toString().replace(/"/g, '""');
        const due = (r.due_date ?? r.dueDate ?? "").toString().replace(/"/g, '""');
        const status = (r.status || "").toString().replace(/"/g, '""');
        return `"${title}","${site}","${assigned}","${due}","${status}"`;
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
      const line = `${index + 1}. ${r.title || "(no title)"}  •  ${
        r.assigned_to ?? r.assignedTo ?? "-"
      }  •  ${r.due_date ?? r.dueDate ?? ""}  •  ${r.status || ""}`;
      doc.text(line, 14, y);
      y += lineHeight;
    });

    doc.save(`tasks-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  const columns = [
    { header: "Title", accessor: "title" },
    { header: "Site", accessor: "site_id", render: (row: any) => row.site_id ?? row.siteId ?? "—" },
    {
      header: "Assigned To",
      accessor: "assigned_to",
      render: (row: any) => {
        const ids = row.assigned_to_ids ?? (row.assigned_to ? [row.assigned_to] : row.assignedTo ? [row.assignedTo] : []);
        if (!ids.length) return "—";
        return ids.map((id: string) => resolveUser(id)).join(", ");
      },
    },
    { header: "Due Date", accessor: "due_date", render: (row: any) => row.due_date ?? row.dueDate ?? "—" },
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
          <div className="p-2 rounded-lg bg-blue-100">
            <ListTodo className="w-5 h-5 text-blue-600" />
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
      <Table columns={columns} data={rows} />
    </div>
  );
}
