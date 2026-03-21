"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
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
      const [aRes, assignRes, uRes, imgRes] = await Promise.all([
        fetch(`/api/assets/${assetId}`),
        fetch(`/api/assets/${assetId}/assignments`).catch(() => ({ json: () => [] })),
        fetch(`/api/companies/${companyId}/operatives`).catch(() => ({ json: () => [] })),
        fetch(`/api/assets/${assetId}/images`).catch(() => ({ json: () => [] })),
      ]);
      const aData = await aRes.json();
      const assignData = await assignRes.json?.() ?? [];
      const uData = await uRes.json?.() ?? [];
      const imgData = await imgRes.json?.() ?? [];

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
    } catch {
      setAsset(null);
      setAssignments([]);
      setImages([]);
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
              <button
                key={img.id}
                type="button"
                onClick={() => openDocumentUrl(img.file_url)}
                className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer text-left"
              >
                <Image src={img.file_url} alt="Asset" fill sizes="200px" className="object-cover" unoptimized />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Assignments</h3>
        {assignments.length === 0 ? (
          <p className="text-slate-500">No assignments yet.</p>
        ) : (
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li key={a.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span>{a.user?.display_name || a.user?.email || a.user_id}</span>
                <span className="text-sm text-slate-500">
                  {new Date(a.assigned_at).toLocaleDateString()}
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
