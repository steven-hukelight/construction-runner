"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Trash2, Boxes, Activity, Package } from "lucide-react";
import Button from "../components/ui/Button";
import { TaskStatusPill } from "../components/ui/TaskStatusPill";
import { CardSelect } from "../components/ui/CardSelect";
import { SitePicker } from "../components/ui/SitePicker";
import Table from "../components/ui/Table";
import { DataTableShell, TableNameCell } from "../components/ui/TableChrome";

interface Asset {
  id: string;
  name: string;
  type?: string;
  category?: string;
  serial_number?: string;
  status?: string;
  condition?: string;
  site_id?: string;
  assigned_to?: string | null;
}

interface User {
  id: string;
  display_name?: string;
  email?: string;
}

export default function AssetsContent({ companyId }: { companyId: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAsset, setNewAsset] = useState({ name: "", category: "equipment", serial_number: "", condition: "good" });
  const [assignModal, setAssignModal] = useState<{ assetId: string; assetName: string } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [filterSite, setFilterSite] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, uRes] = await Promise.all([
        fetch("/api/assets"),
        fetch(`/api/companies/${companyId}/operatives`).catch(() => ({ json: () => [] })),
      ]);
      const a = await aRes.json();
      const u = await uRes.json?.() ?? [];
      setAssets(Array.isArray(a) ? a : []);
      setUsers(Array.isArray(u) ? u : []);
    } catch {
      setAssets([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addAsset() {
    if (!newAsset.name.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAsset.name.trim(),
          category: newAsset.category,
          serial_number: newAsset.serial_number.trim() || null,
          condition: newAsset.condition,
        }),
      });
      setNewAsset({ name: "", category: "equipment", serial_number: "", condition: "good" });
      const res = await fetch("/api/assets");
      const a = await res.json();
      setAssets(Array.isArray(a) ? a : []);
    } finally {
      setLoading(false);
    }
  }

  async function removeAsset(assetId: string, assetName: string) {
    if (!confirm(`Remove asset "${assetName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err?.error ?? "Failed to remove");
        return;
      }
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (e) {
      console.error(e);
      alert("Failed to remove asset");
    }
  }

  async function assignAsset() {
    if (!assignModal || !selectedUserId) return;
    try {
      const res = await fetch("/api/assets/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: assignModal.assetId, user_id: selectedUserId }),
      });
      if (res.ok) load();
      setAssignModal(null);
      setSelectedUserId("");
    } catch (e) {
      console.error(e);
    }
  }

  async function uploadDocument(assetId: string, file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("assetId", assetId);
      const res = await fetch("/api/assets/upload-document", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        alert(err?.error ?? "Upload failed");
      }
    } catch (e) {
      console.error(e);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function exportAssetsCsv(rows: Asset[]) {
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      const needsQuotes = /[",\n\r]/.test(s);
      const out = s.replaceAll('"', '""');
      return needsQuotes ? `"${out}"` : out;
    };

    const headers = [
      "id",
      "name",
      "type",
      "status",
      "serial_number",
      "site_id",
      "assigned_to",
    ];

    const lines = [
      headers.join(","),
      ...rows.map((a) =>
        [
          a.id,
          a.name,
          a.type ?? a.category ?? "",
          a.status ?? a.condition ?? "",
          a.serial_number ?? "",
          a.site_id ?? "",
          a.assigned_to ?? "",
        ]
          .map(esc)
          .join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assets-${companyId}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const st = a.status ?? a.condition ?? "";
      const tp = a.type ?? a.category ?? "";
      const site = String(a.site_id ?? "");
      if (filterStatus && st !== filterStatus) return false;
      if (filterType && tp !== filterType) return false;
      if (filterSite && site !== filterSite) return false;
      return true;
    });
  }, [assets, filterStatus, filterType, filterSite]);

  const siteOptions = useMemo(() => {
    const ids = [
      ...new Set(
        assets
          .map((a) => a.site_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    ];
    return ids.map((id) => ({ id, label: id }));
  }, [assets]);

  if (loading && assets.length === 0) {
    return <div className="text-slate-500 py-12 text-center">Loading assets...</div>;
  }

  return (
    <div className="space-y-6">
      <DataTableShell
        title="All assets"
        subtitle={`${filteredAssets.length} asset${filteredAssets.length === 1 ? "" : "s"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportAssetsCsv(filteredAssets)}
              disabled={filteredAssets.length === 0}
              title="Export current list to CSV"
            >
              Export CSV
            </Button>
            <CardSelect
              items={[
                { id: "equipment", name: "Equipment" },
                { id: "vehicle", name: "Vehicle" },
                { id: "tool", name: "Tool" },
                { id: "ppe", name: "PPE" },
              ]}
              value={filterType}
              onChange={setFilterType}
              icon={Boxes}
              fieldLabel="Type"
              variant="compact"
              allowNone
              noneValue=""
              noneLabel="All types"
              className="w-40"
            />
            <CardSelect
              items={[
                { id: "active", name: "Active" },
                { id: "inactive", name: "Inactive" },
                { id: "maintenance", name: "Maintenance" },
                { id: "good", name: "Good" },
                { id: "fair", name: "Fair" },
                { id: "poor", name: "Poor" },
              ]}
              value={filterStatus}
              onChange={setFilterStatus}
              icon={Activity}
              fieldLabel="Status"
              variant="compact"
              allowNone
              noneValue=""
              noneLabel="All status"
              className="w-40"
            />
            {siteOptions.length > 0 ? (
              <SitePicker
                sites={siteOptions.map((s) => ({ id: s.id, name: s.label }))}
                value={filterSite}
                onChange={setFilterSite}
                variant="compact"
                allowNone
                noneValue=""
                noneLabel="All sites"
                className="w-48"
              />
            ) : null}
          </div>
        }
        extra={
          <div className="flex flex-wrap gap-3 pt-1">
            <input
              type="text"
              className="table-toolbar-input min-w-[180px] flex-1"
              placeholder="Asset name"
              value={newAsset.name}
              onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
            />
            <select
              className="table-toolbar-input w-36"
              value={newAsset.category}
              onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
            >
              <option value="equipment">Equipment</option>
              <option value="vehicle">Vehicle</option>
              <option value="tool">Tool</option>
              <option value="ppe">PPE</option>
            </select>
            <input
              type="text"
              className="table-toolbar-input min-w-[120px] flex-1"
              placeholder="Serial number"
              value={newAsset.serial_number}
              onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
            />
            <select
              className="table-toolbar-input w-28"
              value={newAsset.condition}
              onChange={(e) => setNewAsset({ ...newAsset, condition: e.target.value })}
            >
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
              <option value="damaged">Damaged</option>
            </select>
            <Button onClick={addAsset} disabled={loading || !newAsset.name.trim()} size="sm">
              Add Asset
            </Button>
          </div>
        }
      >
        <Table
          embedded
          columns={[
            {
              header: "Name",
              accessor: "name",
              render: (a: Asset) => (
                <Link href={`/dashboard/assets/${a.id}`} className="table-link">
                  <TableNameCell icon={Package} label={a.name} />
                </Link>
              ),
            },
            { header: "Type", accessor: "type", render: (a: Asset) => a.type ?? a.category ?? "—" },
            { header: "Serial", accessor: "serial_number", render: (a: Asset) => a.serial_number ?? "—" },
            {
              header: "Status",
              accessor: "status",
              render: (a: Asset) => <TaskStatusPill status={a.status ?? a.condition} />,
            },
            { header: "Assigned to", accessor: "assigned_to", render: (a: Asset) => a.assigned_to ?? "—" },
            {
              header: "Actions",
              accessor: "actions",
              render: (a: Asset) => (
                <div className="flex items-center gap-3">
                  <button type="button" className="table-link" onClick={() => setAssignModal({ assetId: a.id, assetName: a.name })}>
                    Assign
                  </button>
                  <label className="table-link cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadDocument(a.id, f);
                        e.target.value = "";
                      }}
                      disabled={uploading}
                    />
                    Upload
                  </label>
                  <button
                    type="button"
                    onClick={() => removeAsset(a.id, a.name)}
                    className="text-red-600 hover:underline"
                    title="Remove asset"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
          data={filteredAssets}
          emptyMessage={assets.length === 0 ? "No assets yet. Create one above." : "No assets match filters."}
        />
      </DataTableShell>

      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Assign: {assignModal.assetName}</h3>
            <select
              className="input w-full mb-4"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Select operative</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.display_name || u.email || u.id}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setAssignModal(null)}>
                Cancel
              </Button>
              <Button onClick={assignAsset} disabled={!selectedUserId}>
                Assign
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
