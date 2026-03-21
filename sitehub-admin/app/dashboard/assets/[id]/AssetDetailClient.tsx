"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { formatDate } from "@/app/DisplayPreferencesProvider";
import Button from "../../components/ui/Button";
import { openDocumentUrl } from "@/lib/openDocumentUrl";
import AssetInspectionModal from "../AssetInspectionModal";
import AssetStatusUpdate from "../AssetStatusUpdate";

interface Asset {
  id: string;
  name: string;
  type?: string;
  status?: string;
  description?: string;
  site_id?: string;
  created_at?: string;
}

interface Assignment {
  id: string;
  user_id: string;
  assigned_at: string;
  user?: { email?: string; display_name?: string };
}

interface AssetImage {
  id: string;
  file_url: string;
  created_at: string;
  uploaded_by_name?: string | null;
}

interface AssetInspection {
  id: string;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  user_id: string;
  recorded_by?: string;
}

export default function AssetDetailClient({
  assetId,
  companyId,
}: {
  assetId: string;
  companyId: string;
}) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [images, setImages] = useState<AssetImage[]>([]);
  const [inspections, setInspections] = useState<AssetInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [users, setUsers] = useState<{ id: string; email?: string; display_name?: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, assignRes, uRes, imgRes, inspRes] = await Promise.all([
        fetch(`/api/assets/${assetId}`),
        fetch(`/api/assets/${assetId}/assignments`).catch(() => ({ json: () => [] })),
        fetch(`/api/companies/${companyId}/operatives`).catch(() => ({ json: () => [] })),
        fetch(`/api/assets/${assetId}/images`).catch(() => ({ json: () => [] })),
        fetch(`/api/assets/${assetId}/inspections`).catch(() => null),
      ]);
      const aData = await aRes.json();
      const assignData = await assignRes.json?.() ?? [];
      const uData = await uRes.json?.() ?? [];
      const imgData = await imgRes.json?.() ?? [];
      const inspData =
        inspRes != null && inspRes.ok ? await inspRes.json().catch(() => []) : [];

      if (aData?.id) {
        setAsset(aData);
      } else if (Array.isArray(aData) && aData.length > 0) {
        setAsset(aData.find((x: Asset) => x.id === assetId) ?? aData[0]);
      } else {
        setAsset(null);
      }
      setAssignments(Array.isArray(assignData) ? assignData : []);
      setUsers(Array.isArray(uData) ? uData : []);
      setImages(Array.isArray(imgData) ? imgData : []);
      setInspections(Array.isArray(inspData) ? inspData : []);
    } catch {
      setAsset(null);
      setAssignments([]);
      setImages([]);
      setInspections([]);
    } finally {
      setLoading(false);
    }
  }, [assetId, companyId]);

  async function handleAddImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const form = new FormData();
      for (let i = 0; i < files.length; i++) form.append("files", files[i]);
      const res = await fetch(`/api/assets/${assetId}/upload-images`, {
        method: "POST",
        body: form,
      });
      if (res.ok) await load();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleExportAsset() {
    const payload = {
      asset: asset ? { id: asset.id, name: asset.name, type: asset.type, status: asset.status, description: asset.description } : null,
      images: images.map((i) => ({ url: i.file_url, created_at: i.created_at })),
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `asset-${assetId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAssign() {
    if (!selectedUserId) return;
    try {
      await fetch("/api/assets/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: assetId, user_id: selectedUserId }),
      });
      setAssignModal(false);
      setSelectedUserId("");
      load();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUnassign(userId: string) {
    if (!confirm("Remove this assignment? The user will no longer see this asset.")) return;
    try {
      const res = await fetch("/api/assets/unassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: assetId, user_id: userId }),
      });
      if (res.ok) load();
      else {
        const err = await res.json();
        alert(err?.error ?? "Failed to remove assignment");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to remove assignment");
    }
  }

  if (loading && !asset) {
    return <div className="text-slate-500 py-12 text-center">Loading asset...</div>;
  }

  if (!asset) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-600 mb-4">Asset not found.</p>
        <Link href="/dashboard/assets">
          <Button variant="secondary">Back to Assets</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{asset.name}</h2>
            <div className="flex gap-2 mt-2">
              <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-sm">{asset.type || "equipment"}</span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-sm">{asset.status || "active"}</span>
            </div>
          </div>
          <Link href="/dashboard/assets">
            <Button variant="secondary" size="sm">Back</Button>
          </Link>
        </div>

        {asset.description && (
          <p className="text-gray-600 mb-6">{asset.description}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Status</h3>
            <AssetStatusUpdate asset={asset} onUpdate={() => load()} />
          </div>
          <div>
            <h3 className="font-semibold mb-2">Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setInspectionOpen(true)}>
                Record Inspection
              </Button>
              <Button size="sm" onClick={() => setAssignModal(true)}>
                Assign
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleAddImages}
              />
              <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? "Uploading…" : "Add Images"}
              </Button>
              <Button size="sm" variant="secondary" onClick={handleExportAsset}>
                Export Asset
              </Button>
            </div>
          </div>
        </div>
      </div>

      {images.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Images</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {images.map((img) => (
              <div key={img.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => openDocumentUrl(img.file_url)}
                  className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer text-left block w-full"
                >
                  <Image src={img.file_url} alt="Asset" fill sizes="200px" className="object-cover" unoptimized />
                </button>
                {img.uploaded_by_name && (
                  <p className="text-xs text-gray-500 truncate" title={img.uploaded_by_name}>
                    {img.uploaded_by_name}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Inspections</h3>
        {inspections.length === 0 ? (
          <p className="text-slate-500">No inspections recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {inspections.map((insp) => (
              <li
                key={insp.id}
                className="py-3 border-b border-gray-100 last:border-0 last:pb-0 first:pt-0"
              >
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-medium text-gray-900">
                    {insp.recorded_by || insp.user_id}
                  </span>
                  <span className="text-slate-500">{formatDate(insp.created_at)}</span>
                </div>
                {insp.notes ? (
                  <p className="text-gray-700 mt-1 whitespace-pre-wrap">{insp.notes}</p>
                ) : (
                  <p className="text-slate-400 text-sm mt-1">No notes</p>
                )}
                {insp.photo_url && (
                  <button
                    type="button"
                    onClick={() => openDocumentUrl(insp.photo_url!)}
                    className="text-sm text-blue-600 hover:underline mt-2"
                  >
                    View photo
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Assignments</h3>
        {assignments.length === 0 ? (
          <p className="text-slate-500">No assignments yet. Unassigned assets are only visible to admin until assigned.</p>
        ) : (
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li key={a.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 gap-2">
                <span>{a.user?.display_name || a.user?.email || a.user_id}</span>
                <span className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">{formatDate(a.assigned_at)}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleUnassign(a.user_id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {inspectionOpen && (
        <AssetInspectionModal
          assetId={assetId}
          assetName={asset.name}
          onClose={() => setInspectionOpen(false)}
          onSuccess={() => { setInspectionOpen(false); load(); }}
        />
      )}

      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Assign to operative</h3>
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
              <Button variant="secondary" onClick={() => setAssignModal(false)}>Cancel</Button>
              <Button onClick={handleAssign} disabled={!selectedUserId}>Assign</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
