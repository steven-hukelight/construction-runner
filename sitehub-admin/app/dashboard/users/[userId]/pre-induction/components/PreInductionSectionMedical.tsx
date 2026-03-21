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

interface PreInductionSectionMedicalProps {
  userId: string;
  data: Record<string, unknown> | null;
  onSaved?: () => void;
}

export default function PreInductionSectionMedical({
  userId,
  data,
  onSaved,
}: PreInductionSectionMedicalProps) {
  const hasMedicalIssues = data?.hasMedicalIssues ?? data?.has_medical_issues;
  const fitToWork = getBool(data, "fitToWork");
  const [form, setForm] = useState({
    medicalDeclaration: getStr(data, "medicalDeclaration"),
    hasMedicalIssues: hasMedicalIssues === true ? true : hasMedicalIssues === false ? false : (fitToWork ? false : undefined as boolean | undefined),
    fitToWork,
    allergies: getStr(data, "allergies"),
    medication: getStr(data, "medication"),
    medicalCertificateUrl: getStr(data, "medicalCertificateUrl"),
    medicalVerified: getBool(data, "medicalVerified"),
    notes: getStr(data, "notes"),
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (file: File) => {
    const allowed = [".pdf", ".png", ".jpg", ".jpeg"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error("Allowed: PDF, PNG, JPG");
      return;
    }
    setUploading(true);
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
          sectionId: "medical",
          fieldName: "medicalCertificate",
          fileName: file.name,
          fileBase64: base64,
        }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setForm((f) => ({ ...f, medicalCertificateUrl: json.fileUrl }));
      toast.success("File uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/pre-induction/${userId}/medical`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          hasMedicalIssues: form.hasMedicalIssues,
          fitToWork: form.hasMedicalIssues === false,
          medicalVerifiedBy: form.medicalVerified ? null : undefined,
          medicalVerifiedAt: form.medicalVerified ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      toast.success("Medical section saved");
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Medical</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Medical declaration (optional)</label>
          <textarea
            value={form.medicalDeclaration}
            onChange={(e) => setForm((f) => ({ ...f, medicalDeclaration: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Do you have any medical issues that could affect your fitness to work?</label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="hasMedicalIssues"
                checked={form.hasMedicalIssues === false}
                onChange={() => setForm((f) => ({ ...f, hasMedicalIssues: false }))}
                className="text-blue-600"
              />
              <span className="text-sm">No</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="hasMedicalIssues"
                checked={form.hasMedicalIssues === true}
                onChange={() => setForm((f) => ({ ...f, hasMedicalIssues: true }))}
                className="text-blue-600"
              />
              <span className="text-sm">Yes</span>
            </label>
          </div>
          <p className="mt-1 text-xs text-gray-500">If No, no medical certificate is required. If Yes, please upload a certificate.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Allergies (optional)</label>
          <input
            type="text"
            value={form.allergies}
            onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Medication (optional)</label>
          <input
            type="text"
            value={form.medication}
            onChange={(e) => setForm((f) => ({ ...f, medication: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Medical certificate {form.hasMedicalIssues === true ? "(required)" : "(optional – only if you have medical issues)"}
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              id="medical-cert-file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
                e.target.value = "";
              }}
            />
            <label
              htmlFor="medical-cert-file"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Upload size={16} />
              {uploading ? "Uploading..." : form.medicalCertificateUrl ? "Replace" : "Upload"}
            </label>
            {form.medicalCertificateUrl && (
              <a href={getPreInductionFileViewUrl(form.medicalCertificateUrl) ?? form.medicalCertificateUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                View
              </a>
            )}
          </div>
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="medicalVerified"
            checked={form.medicalVerified}
            onChange={(e) => setForm((f) => ({ ...f, medicalVerified: e.target.checked }))}
            className="rounded border-gray-300 text-blue-600"
          />
          <label htmlFor="medicalVerified" className="text-sm font-medium text-gray-700">
            Medical verified (admin)
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
