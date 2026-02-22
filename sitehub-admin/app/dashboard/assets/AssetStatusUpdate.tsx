"use client";

import React, { useState } from "react";
import Button from "../components/ui/Button";

interface Asset {
  id: string;
  status?: string;
}

interface AssetStatusUpdateProps {
  asset: Asset;
  onUpdate: () => void;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "maintenance", label: "Maintenance" },
  { value: "retired", label: "Retired" },
];

export default function AssetStatusUpdate({ asset, onUpdate }: AssetStatusUpdateProps) {
  const [status, setStatus] = useState(asset.status || "active");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <select
        className="input w-36"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Update"}
      </Button>
    </div>
  );
}
