"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useTableDensityClasses } from "@/app/DisplayPreferencesProvider";
import Button from "../components/ui/Button";
import { TaskStatusPill } from "../components/ui/TaskStatusPill";

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
  const density = useTableDensityClasses();
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
    const ids = [...new Set(assets.map((a) => a.site_id).filter(Boolean))];
    return ids.map((id) => ({ id, label: id }));
  }, [assets]);

  if (loading && assets.length === 0) {
    return <div className="text-slate-500 py-12 text-center">Loading assets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Create Asset</h3>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            className="input flex-1 min-w-[180px]"
            placeholder="Asset name"
            value={newAsset.name}
            onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
          />
          <select
            className="input w-36"
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
            className="input flex-1 min-w-[120px]"
            placeholder="Serial number"
            value={newAsset.serial_number}
            onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
          />
          <select
            className="input w-28"
            value={newAsset.condition}
            onChange={(e) => setNewAsset({ ...newAsset, condition: e.target.value })}
          >
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
            <option value="damaged">Damaged</option>
          </select>
          <Button onClick={addAsset} disabled={loading || !newAsset.name.trim()}>
            Add Asset
          </Button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold">Asset List</h3>
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportAssetsCsv(filteredAssets)}
              disabled={filteredAssets.length === 0}
              title="Export current list to CSV"
            >
              Export CSV
            </Button>
            <select
              className="input w-32 text-sm py-2"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All types</option>
              <option value="equipment">Equipment</option>
              <option value="vehicle">Vehicle</option>
              <option value="tool">Tool</option>
              <option value="ppe">PPE</option>
            </select>
            <select
              className="input w-32 text-sm py-2"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
            {siteOptions.length > 0 && (
              <select
                className="input w-36 text-sm py-2"
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
              >
                <option value="">All sites</option>
                {siteOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full ${density.table}`}>
            <thead className="bg-gray-50">
              <tr>
                <th className={`${density.th} text-left font-medium`}>Name</th>
                <th className={`${density.th} text-left font-medium`}>Type</th>
                <th className={`${density.th} text-left font-medium`}>Serial</th>
                <th className={`${density.th} text-left font-medium`}>Status</th>
                <th className={`${density.th} text-left font-medium`}>Assigned to</th>
                <th className={`${density.th} text-left font-medium`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAssets.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className={`${density.td} font-medium`}>
                    <Link href={`/dashboard/assets/${a.id}`} className="text-blue-600 hover:underline">
                      {a.name}
                    </Link>
                  </td>
                  <td className={density.td}>{a.type ?? a.category ?? "—"}</td>
                  <td className={density.td}>{a.serial_number ?? "—"}</td>
                  <td className={density.td}><TaskStatusPill status={a.status ?? a.condition} /></td>
                  <td className={density.td}>{a.assigned_to ?? "—"}</td>
                  <td className={density.td}>
                    <div className="flex gap-2 items-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setAssignModal({ assetId: a.id, assetName: a.name })}
                      >
                        Assign
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => removeAsset(a.id, a.name)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        title="Remove asset"
                      >
                        <Trash2 size={16} />
                      </Button>
                      <label className="inline-flex">
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
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border cursor-pointer ${
                            uploading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                          }`}
                        >
                          Upload
                        </span>
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredAssets.length === 0 && (
          <div className="text-center text-slate-500 py-12">
            {assets.length === 0 ? "No assets yet. Create one above." : "No assets match filters."}
          </div>
        )}
      </div>

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
