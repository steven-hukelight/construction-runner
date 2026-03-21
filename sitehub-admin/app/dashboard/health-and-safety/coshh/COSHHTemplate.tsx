"use client";

import { useEffect, useState } from "react";
import { FlaskConical, Plus } from "lucide-react";
import { openDocumentUrl } from "@/lib/openDocumentUrl";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import TableActions from "../../components/ui/TableActions";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";

type COSHHItem = {
  id: string;
  title?: string;
  substance?: string;
  hazardSymbols?: string[];
  ppe?: string;
  fileUrl?: string;
};

export default function COSHHTemplate() {
  const [items, setItems] = useState<COSHHItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    title: "",
    substance: "",
    hazardSymbols: "",
    ppe: "",
  });

  useEffect(() => {
    const companyId = getCompanyIdFromClient();
    if (!companyId) return;
    fetch("/api/coshh", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then(setItems);
  }, []);

  async function save() {
    const res = await fetch("/api/coshh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        hazardSymbols: form.hazardSymbols.split(",").map((s) => s.trim()).filter(Boolean),
      }),
      credentials: "include",
    });
    const data = await res.json();
    if (data.id) {
      setItems((prev) => [
        { id: data.id, ...form, hazardSymbols: form.hazardSymbols.split(",").map((s) => s.trim()).filter(Boolean) },
        ...prev,
      ]);
      setAdding(false);
      setForm({ title: "", substance: "", hazardSymbols: "", ppe: "" });
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this assessment?")) return;
    await fetch(`/api/coshh/${id}`, { method: "DELETE", credentials: "include" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const columns = [
    { header: "Title", accessor: "title" },
    { header: "Substance", accessor: "substance" },
    {
      header: "Hazard Symbols",
      accessor: "hazardSymbols",
      render: (row: COSHHItem) =>
        Array.isArray(row.hazardSymbols) ? row.hazardSymbols.join(", ") : row.hazardSymbols || "—",
    },
    { header: "PPE", accessor: "ppe" },
    {
      header: "Actions",
      accessor: "actions",
      render: (row: COSHHItem) => (
        <TableActions
          items={[
            ...(row.fileUrl
              ? [{ label: "View", onClick: () => openDocumentUrl(row.fileUrl!) }]
              : []),
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
          <div className="p-2 rounded-lg bg-purple-100">
            <FlaskConical className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">COSHH Assessments</h3>
            <p className="text-sm text-slate-600">
              Hazard symbols and PPE requirements for hazardous substances.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus size={18} /> Add Assessment
        </Button>
      </div>

      {adding && (
        <div className="mb-6 p-6 rounded-xl border border-purple-200 bg-purple-50/30 space-y-4">
          <h4 className="font-medium text-slate-900">New COSHH Assessment</h4>
          <Input
            label="Title"
            value={form.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((f) => ({ ...f, title: e.target.value }))
            }
            placeholder="e.g. Cement dust"
          />
          <Input
            label="Substance"
            value={form.substance}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((f) => ({ ...f, substance: e.target.value }))
            }
            placeholder="e.g. Portland cement"
          />
          <Input
            label="Hazard symbols (comma-separated)"
            value={form.hazardSymbols}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((f) => ({ ...f, hazardSymbols: e.target.value }))
            }
            placeholder="e.g. Irritant, Respiratory"
          />
          <Input
            label="PPE required"
            value={form.ppe}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((f) => ({ ...f, ppe: e.target.value }))
            }
            placeholder="e.g. P3 mask, gloves"
          />
          <div className="flex gap-2">
            <Button onClick={save}>Save</Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <Table columns={columns} data={items} />
    </div>
  );
}
