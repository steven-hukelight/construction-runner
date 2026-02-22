"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, Upload } from "lucide-react";

type TrainingRecord = {
  type: string;
  completedAt: string;
  expiry: string;
  fileUrl: string;
  verified: boolean;
  notes: string;
};

function parseRecords(d: Record<string, unknown> | null): TrainingRecord[] {
  const arr = d?.trainingRecords;
  if (!Array.isArray(arr)) return [];
  return arr.map((r: Record<string, unknown>) => {
    const raw = r?.completedAt;
    const completed =
      typeof raw === "string"
        ? raw.slice(0, 10)
        : (raw as { toDate?: () => Date })?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? "";
    const rawExp = r?.expiry;
    const expiry =
      typeof rawExp === "string"
        ? rawExp.slice(0, 10)
        : (rawExp as { toDate?: () => Date })?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? "";
    return {
      type: String(r?.type ?? ""),
      completedAt: completed,
      expiry,
      fileUrl: String(r?.fileUrl ?? ""),
      verified: !!r?.verified,
      notes: String(r?.notes ?? ""),
    };
  });
}

interface PreInductionSectionTrainingProps {
  userId: string;
  data: Record<string, unknown> | null;
  onSaved?: () => void;
}

export default function PreInductionSectionTraining({
  userId,
  data,
  onSaved,
}: PreInductionSectionTrainingProps) {
  const [records, setRecords] = useState<TrainingRecord[]>(() => parseRecords(data));
  const [ramsAccepted, setRamsAccepted] = useState(!!data?.ramsAccepted);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const addRecord = () => {
    setRecords((prev) => [
      ...prev,
      { type: "", completedAt: "", expiry: "", fileUrl: "", verified: false, notes: "" },
    ]);
  };

  const removeRecord = (i: number) => {
    setRecords((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateRecord = (i: number, updates: Partial<TrainingRecord>) => {
    setRecords((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...updates } : r))
    );
  };

  const handleFileUpload = async (index: number, file: File) => {
    const allowed = [".pdf", ".png", ".jpg", ".jpeg"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error("Allowed: PDF, PNG, JPG");
      return;
    }
    const key = `tr-${index}`;
    setUploading(key);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch(`/api/pre-induction/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            sectionId: "training",
            fieldName: `record-${index}`,
            fileName: file.name,
            fileBase64: base64,
          }),
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        updateRecord(index, { fileUrl: json.fileUrl });
        toast.success("File uploaded");
      };
      reader.readAsDataURL(file);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = records.map((r) => ({
        type: r.type || "Training",
        completedAt: r.completedAt || null,
        expiry: r.expiry || null,
        fileUrl: r.fileUrl || null,
        verified: r.verified,
        verifiedBy: null,
        verifiedAt: null,
        notes: r.notes || null,
      }));
      const res = await fetch(`/api/pre-induction/${userId}/training`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainingRecords: payload,
          ramsAccepted,
          ramsAcceptedAt: ramsAccepted ? new Date().toISOString() : null,
          ramsVersion: null,
          updatedAt: new Date().toISOString(),
        }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      toast.success("Training section saved");
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Training</h3>
      <div className="space-y-4">
        {records.map((rec, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="text-sm font-medium text-gray-600">Record {i + 1}</span>
              <button
                type="button"
                onClick={() => removeRecord(i)}
                className="text-red-600 hover:text-red-700 p-1"
                aria-label="Remove"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-500">Type</label>
                <input
                  type="text"
                  value={rec.type}
                  onChange={(e) => updateRecord(i, { type: e.target.value })}
                  placeholder="e.g. Toolbox Talk, Manual Handling"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Completed at</label>
                <input
                  type="date"
                  value={rec.completedAt}
                  onChange={(e) => updateRecord(i, { completedAt: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Expiry</label>
                <input
                  type="date"
                  value={rec.expiry}
                  onChange={(e) => updateRecord(i, { expiry: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">File</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    id={`tr-file-${i}`}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(i, f);
                      e.target.value = "";
                    }}
                  />
                  <label
                    htmlFor={`tr-file-${i}`}
                    className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1.5 text-xs hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Upload size={12} />
                    {uploading === `tr-${i}` ? "Uploading..." : rec.fileUrl ? "Replace" : "Upload"}
                  </label>
                  {rec.fileUrl && (
                    <a href={rec.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 truncate">
                      View
                    </a>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`tr-verified-${i}`}
                  checked={rec.verified}
                  onChange={(e) => updateRecord(i, { verified: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600"
                />
                <label htmlFor={`tr-verified-${i}`} className="text-sm">Verified</label>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500">Notes</label>
                <input
                  type="text"
                  value={rec.notes}
                  onChange={(e) => updateRecord(i, { notes: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="ramsAccepted"
            checked={ramsAccepted}
            onChange={(e) => setRamsAccepted(e.target.checked)}
            className="rounded border-gray-300 text-blue-600"
          />
          <label htmlFor="ramsAccepted" className="text-sm font-medium text-gray-700">
            RAMS accepted
          </label>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addRecord}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Plus size={16} />
          Add training record
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
          style={{ backgroundColor: "#2563EB" }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
