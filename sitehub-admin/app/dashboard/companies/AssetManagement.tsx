"use client";

import React, { useState, useEffect } from "react";
import Button from "../components/ui/Button";

interface Asset {
  id: string;
  name: string;
  description?: string;
  status?: string;
}

export default function AssetManagement({ companyId }: { companyId: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [newAsset, setNewAsset] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch assets for the company
    fetch(`/api/companies/${companyId}/assets`)
      .then((res) => res.json())
      .then((data) => setAssets(Array.isArray(data) ? data : []));
  }, [companyId]);

  async function addAsset() {
    if (!newAsset.name.trim()) return;
    setLoading(true);
    await fetch(`/api/companies/${companyId}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAsset),
    });
    setNewAsset({ name: "", description: "" });
    // Refresh assets
    fetch(`/api/companies/${companyId}/assets`)
      .then((res) => res.json())
      .then((data) => setAssets(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Asset Management</h3>
      <div className="max-h-64 overflow-y-auto mb-4 border rounded p-2 bg-slate-50">
        {assets.length === 0 ? (
          <div className="text-slate-400 text-sm">No assets yet.</div>
        ) : (
          assets.map((asset) => (
            <div key={asset.id} className="mb-2">
              <span className="font-bold text-blue-700 mr-2">{asset.name}</span>
              <span className="text-xs text-slate-400">{asset.status || "Active"}</span>
              <div className="ml-6 text-slate-800">{asset.description}</div>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          className="input flex-1"
          placeholder="Asset name"
          value={newAsset.name}
          onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
          disabled={loading}
        />
        <input
          type="text"
          className="input flex-1"
          placeholder="Description (optional)"
          value={newAsset.description}
          onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
          disabled={loading}
        />
        <Button onClick={addAsset} disabled={loading || !newAsset.name.trim()}>
          Add Asset
        </Button>
      </div>
    </div>
  );
}
