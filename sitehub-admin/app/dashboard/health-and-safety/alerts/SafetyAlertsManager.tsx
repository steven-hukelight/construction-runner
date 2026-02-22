"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import TableActions from "../../components/ui/TableActions";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";

const SEVERITIES = [
  { id: "info", label: "Info", class: "bg-blue-100 text-blue-800" },
  { id: "warning", label: "Warning", class: "bg-amber-100 text-amber-800" },
  { id: "critical", label: "Critical", class: "bg-red-100 text-red-800" },
] as const;

type AlertItem = {
  id: string;
  title?: string;
  description?: string;
  severity?: string;
  createdAt?: unknown;
};

export default function SafetyAlertsManager() {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", severity: "info" });

  useEffect(() => {
    const companyId = getCompanyIdFromClient();
    if (!companyId) return;
    fetch("/api/safety-alerts", { credentials: "include" })
      .then((r) => r.json())
      .then(setItems);
  }, []);

  async function save() {
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
      setForm({ title: "", description: "", severity: "info" });
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
      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${sv.class}`}>
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
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Safety Alerts</h3>
            <p className="text-sm text-slate-600">
              Site safety alerts with severity levels: info, warning, critical.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus size={18} /> Add Alert
        </Button>
      </div>

      {adding && (
        <div className="mb-6 p-6 rounded-xl border border-red-200 bg-red-50/30 space-y-4">
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
            <Button onClick={save}>Save</Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <Table columns={columns} data={items} density="comfortable" />
    </div>
  );
}
