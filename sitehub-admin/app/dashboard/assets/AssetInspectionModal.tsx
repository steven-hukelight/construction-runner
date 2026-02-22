"use client";

import React, { useState } from "react";
import Button from "../components/ui/Button";

interface AssetInspectionModalProps {
  assetId: string;
  assetName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssetInspectionModal({
  assetId,
  assetName,
  onClose,
  onSuccess,
}: AssetInspectionModalProps) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        // TODO: Upload to asset_photos bucket, get URL
        // For now, omit photo; add upload endpoint when storage is configured
      }
      const res = await fetch("/api/assets/inspection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: assetId, notes, photo_url: photoUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err?.error ?? "Inspection failed");
        return;
      }
      onSuccess();
    } catch (e) {
      alert("Inspection failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-2">Record Inspection: {assetName}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              className="input w-full min-h-[100px]"
              placeholder="Inspection notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Save Inspection"}
          </Button>
        </div>
      </div>
    </div>
  );
}
