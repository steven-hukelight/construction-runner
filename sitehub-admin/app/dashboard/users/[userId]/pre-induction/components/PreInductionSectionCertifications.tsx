"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { getPreInductionFileViewUrl } from "@/lib/preInductionFileUrl";
import { Plus, Trash2, Upload } from "lucide-react";

const CERT_TYPES = [
  "CSCS",
  "CPCS",
  "IPAF",
  "PASMA",
  "FIRST_AID",
  "MANUAL_HANDLING",
  "ASBESTOS",
  "FIRE_MARSHAL",
  "SMSTS",
  "SSSTS",
  "CONFINED_SPACES",
  "Other",
];

type CertItem = {
  type: string;
  cardNumber: string;
  fileUrl: string;
  expiry: string;
  verified: boolean;
  notes: string;
};

function parseCerts(d: Record<string, unknown> | null): CertItem[] {
  const arr = d?.certifications;
  if (!Array.isArray(arr)) return [];
  return arr.map((c: Record<string, unknown>) => ({
    type: String(c?.type ?? ""),
    cardNumber: String(c?.cardNumber ?? ""),
    fileUrl: String(c?.fileUrl ?? ""),
    expiry: typeof c?.expiry === "string" ? c.expiry.slice(0, 10) : (c?.expiry as { toDate?: () => Date })?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? "",
    verified: !!c?.verified,
    notes: String(c?.notes ?? ""),
  }));
}

interface PreInductionSectionCertificationsProps {
  userId: string;
  data: Record<string, unknown> | null;
  onSaved?: () => void;
}

export default function PreInductionSectionCertifications({
  userId,
  data,
  onSaved,
}: PreInductionSectionCertificationsProps) {
  const [certs, setCerts] = useState<CertItem[]>(() => parseCerts(data));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const addCert = () => {
    setCerts((prev) => [...prev, { type: "", cardNumber: "", fileUrl: "", expiry: "", verified: false, notes: "" }]);
  };

  const removeCert = (i: number) => {
    setCerts((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateCert = (i: number, updates: Partial<CertItem>) => {
    setCerts((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, ...updates } : c))
    );
  };

  const handleFileUpload = async (index: number, file: File) => {
    const allowed = [".pdf", ".png", ".jpg", ".jpeg"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error("Allowed: PDF, PNG, JPG");
      return;
    }
    const key = `cert-${index}`;
    setUploading(key);
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
          sectionId: "certifications",
          fieldName: `cert-${index}`,
          fileName: file.name,
          fileBase64: base64,
        }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      updateCert(index, { fileUrl: json.fileUrl });
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
      const payload = certs.map((c) => ({
        type: c.type || "Other",
        cardNumber: c.cardNumber || null,
        fileUrl: c.fileUrl || null,
        expiry: c.expiry || null,
        verified: c.verified,
        verifiedBy: null,
        verifiedAt: null,
        notes: c.notes || null,
      }));
      const res = await fetch(`/api/pre-induction/${userId}/certifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certifications: payload, updatedAt: new Date().toISOString() }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      toast.success("Certifications saved");
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Certifications</h3>
      <div className="mt-2 block">
        <button
          type="button"
          onClick={addCert}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Plus size={16} />
          Add Cert
        </button>
      </div>
      <div className="space-y-4">
        {certs.map((cert, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-gray-50/50 p-4"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="text-sm font-medium text-gray-600">Certification {i + 1}</span>
              <button
                type="button"
                onClick={() => removeCert(i)}
                className="text-red-600 hover:text-red-700 p-1"
                aria-label="Remove"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-500">Type</label>
                <select
                  value={cert.type}
                  onChange={(e) => updateCert(i, { type: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {CERT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500">Card number</label>
                <input
                  type="text"
                  value={cert.cardNumber}
                  onChange={(e) => updateCert(i, { cardNumber: e.target.value })}
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
                    id={`cert-file-${i}`}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(i, f);
                      e.target.value = "";
                    }}
                  />
                  <label
                    htmlFor={`cert-file-${i}`}
                    className="inline-flex cursor-pointer items-center gap-1 rounded border border-gray-300 px-2 py-1.5 text-xs hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Upload size={12} />
                    {uploading === `cert-${i}` ? "Uploading..." : cert.fileUrl ? "Replace" : "Upload"}
                  </label>
                  {cert.fileUrl && (
                    <a href={getPreInductionFileViewUrl(cert.fileUrl) ?? cert.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 truncate">
                      View
                    </a>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500">Expiry</label>
                <input
                  type="date"
                  value={cert.expiry}
                  onChange={(e) => updateCert(i, { expiry: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`cert-verified-${i}`}
                  checked={cert.verified}
                  onChange={(e) => updateCert(i, { verified: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600"
                />
                <label htmlFor={`cert-verified-${i}`} className="text-sm">
                  Verified
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500">Notes</label>
                <input
                  type="text"
                  value={cert.notes}
                  onChange={(e) => updateCert(i, { notes: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
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
