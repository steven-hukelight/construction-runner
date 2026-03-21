"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Upload } from "lucide-react";
import { getPreInductionFileViewUrl } from "@/lib/preInductionFileUrl";

function getStr(d: Record<string, unknown> | null, k: string): string {
  const v = d?.[k];
  return v != null ? String(v) : "";
}
function getBool(d: Record<string, unknown> | null, k: string): boolean {
  return !!d?.[k];
}

interface PreInductionSectionRightToWorkProps {
  userId: string;
  data: Record<string, unknown> | null;
  onSaved?: () => void;
}

export default function PreInductionSectionRightToWork({
  userId,
  data,
  onSaved,
}: PreInductionSectionRightToWorkProps) {
  const [form, setForm] = useState({
    passportUrl: getStr(data, "passportUrl"),
    passportExpiry: getStr(data, "passportExpiry")?.slice(0, 10) ?? "",
    visaUrl: getStr(data, "visaUrl"),
    visaExpiry: getStr(data, "visaExpiry")?.slice(0, 10) ?? "",
    shareCode: getStr(data, "shareCode"),
    proofOfAddressUrl: getStr(data, "proofOfAddressUrl"),
    rightToWorkVerified: getBool(data, "rightToWorkVerified"),
    notes: getStr(data, "notes"),
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const handleFileSelect = async (
    field: "passportUrl" | "visaUrl" | "proofOfAddressUrl",
    file: File
  ) => {
    const allowed = [".pdf", ".png", ".jpg", ".jpeg"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error("Allowed: PDF, PNG, JPG");
      return;
    }
    setUploading(field);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const res = await fetch(`/api/pre-induction/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          sectionId: "rightToWork",
          fieldName: field,
          fileName: file.name,
          fileBase64: base64,
        }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setForm((f) => ({ ...f, [field]: json.fileUrl }));
      toast.success("File uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        passportExpiry: form.passportExpiry || null,
        visaExpiry: form.visaExpiry || null,
        rightToWorkVerifiedBy: null,
        rightToWorkVerifiedAt: null,
        updatedAt: new Date().toISOString(),
      };
      if (form.rightToWorkVerified) {
        payload.rightToWorkVerifiedAt = new Date().toISOString();
      }
      const res = await fetch(`/api/pre-induction/${userId}/right-to-work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      toast.success("Right to Work section saved");
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const FileField = ({
    label,
    field,
    value,
  }: {
    label: string;
    field: "passportUrl" | "visaUrl" | "proofOfAddressUrl";
    value: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1 flex gap-2">
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          id={`file-${field}`}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelect(field, f);
            e.target.value = "";
          }}
        />
        <label
          htmlFor={`file-${field}`}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <Upload size={16} />
          {uploading === field ? "Uploading..." : value ? "Replace" : "Upload"}
        </label>
        {value && (
          <a
            href={getPreInductionFileViewUrl(value) ?? value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline truncate max-w-[200px]"
          >
            View
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Right to Work</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FileField label="Passport (optional — store file + expiry only)" field="passportUrl" value={form.passportUrl} />
        <div>
          <label className="block text-sm font-medium text-gray-700">Passport expiry</label>
          <input
            type="date"
            value={form.passportExpiry}
            onChange={(e) => setForm((f) => ({ ...f, passportExpiry: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
          />
        </div>
        <FileField label="Visa (optional)" field="visaUrl" value={form.visaUrl} />
        <div>
          <label className="block text-sm font-medium text-gray-700">Visa expiry</label>
          <input
            type="date"
            value={form.visaExpiry}
            onChange={(e) => setForm((f) => ({ ...f, visaExpiry: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Share code</label>
          <input
            type="text"
            value={form.shareCode}
            onChange={(e) => setForm((f) => ({ ...f, shareCode: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
          />
        </div>
        <FileField label="Proof of address (optional)" field="proofOfAddressUrl" value={form.proofOfAddressUrl} />
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="rtw-verified"
            checked={form.rightToWorkVerified}
            onChange={(e) =>
              setForm((f) => ({ ...f, rightToWorkVerified: e.target.checked }))
            }
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="rtw-verified" className="text-sm font-medium text-gray-700">
            Right to Work verified (admin)
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
          />
        </div>
      </div>
      <div className="flex justify-end">
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
