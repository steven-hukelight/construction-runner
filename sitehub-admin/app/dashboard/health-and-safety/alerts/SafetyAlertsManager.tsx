"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import { DataTableShell } from "../../components/ui/TableChrome";
import TableActions from "../../components/ui/TableActions";
import { SafetyRecordCard } from "../../components/ui/SafetyRecordCard";
import { SitePicker } from "../../components/ui/SitePicker";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";

const SEVERITIES = [
  { id: "info", label: "Info", class: "status-chip--info" },
  { id: "warning", label: "Warning", class: "status-chip--warn" },
  { id: "critical", label: "Critical", class: "status-chip--danger" },
] as const;

type AlertItem = {
  id: string;
  title?: string;
  description?: string;
  severity?: string;
  createdAt?: unknown;
  site_id?: string | null;
};

export default function SafetyAlertsManager() {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", severity: "info", siteId: "" });
  const [sites, setSites] = useState<{ id: string; name?: string }[]>([]);

  useEffect(() => {
    const companyId = getCompanyIdFromClient();
    if (!companyId) return;
    fetch("/api/safety-alerts", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then(setItems);
    fetch("/api/sites", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr) => {
        const list = Array.isArray(arr) ? arr : [];
        setSites(list);
        if (list.length === 1) setForm((f) => (f.siteId ? f : { ...f, siteId: list[0].id }));
      })
      .catch(() => setSites([]));
  }, []);

  async function save() {
    if (!form.siteId) {
      alert("Select a site. This alert will only appear for that site.");
      return;
    }
    const res = await fetch("/api/safety-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
      credentials: "include",
    });
    const data = await res.json();
    if (data.id) {
      setItems((prev) => [{ id: data.id, ...form }, ...prev]);
      setAdding(false);
      setForm({ title: "", description: "", severity: "info", siteId: sites.length === 1 ? sites[0].id : "" });
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this alert?")) return;
    await fetch(`/api/safety-alerts/${id}`, { method: "DELETE", credentials: "include" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const severityBadge = (s: string) => {
    const sv = SEVERITIES.find((x) => x.id === s) ?? SEVERITIES[0];
    return (
      <span className={`status-chip ${sv.class}`}>
        {sv.label}
      </span>
    );
  };

  const columns = [
    { header: "Title", accessor: "title" },
    { header: "Description", accessor: "description" },
    {
      header: "Severity",
      accessor: "severity",
      render: (row: AlertItem) => severityBadge(row.severity || "info"),
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row: AlertItem) => (
        <TableActions
          items={[
            { label: "Delete", onClick: () => remove(row.id), variant: "danger" as const },
          ]}
        />
      ),
    },
  ];

  return (
    <DataTableShell
      title="Safety alerts"
      subtitle="Site safety alerts with severity levels: info, warning, critical."
      actions={
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus size={18} /> Add Alert
        </Button>
      }
      extra={
        adding ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/30 p-4 space-y-4">
          <h4 className="font-medium text-slate-900">New Safety Alert</h4>
          <Input
            label="Title"
            value={form.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((f) => ({ ...f, title: e.target.value }))
            }
            placeholder="e.g. Wet floors in Block A"
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Details"
          />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Site <span className="text-red-600">*</span>
            </label>
            <SitePicker sites={sites} value={form.siteId} onChange={(siteId) => setForm((f) => ({ ...f, siteId }))} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Severity</label>
            <select
              value={form.severity}
              onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
              className="w-full px-5 py-3.5 bg-white/90 border border-gray-200/80 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {SEVERITIES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={!form.siteId}>Save</Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
        ) : null
      }
    >
      <div className="space-y-3 p-4 md:hidden">
        {items.map((row) => (
          <SafetyRecordCard
            key={row.id}
            icon={AlertTriangle}
            accent={row.severity === "critical" ? "red" : row.severity === "warning" ? "amber" : "blue"}
            title={row.title || "Untitled"}
            subtitle={row.description}
            badges={severityBadge(row.severity || "info")}
            actions={
              <button type="button" onClick={() => remove(row.id)} className="text-sm text-red-600 hover:underline">
                Delete
              </button>
            }
          />
        ))}
      </div>
      <div className="hidden md:block">
        <Table embedded columns={columns} data={items} />
      </div>
    </DataTableShell>
  );
}
