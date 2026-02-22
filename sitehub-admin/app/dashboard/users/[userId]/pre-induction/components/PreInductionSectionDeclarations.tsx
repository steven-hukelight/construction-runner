"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Upload } from "lucide-react";

function getStr(d: Record<string, unknown> | null, k: string): string {
  const v = d?.[k];
  return v != null ? String(v) : "";
}
function getBool(d: Record<string, unknown> | null, k: string): boolean {
  return !!d?.[k];
}

interface PreInductionSectionDeclarationsProps {
  userId: string;
  data: Record<string, unknown> | null;
  onSaved?: () => void;
}

export default function PreInductionSectionDeclarations({
  userId,
  data,
  onSaved,
}: PreInductionSectionDeclarationsProps) {
  const [form, setForm] = useState({
    operativeDeclarationAccepted: getBool(data, "operativeDeclarationAccepted"),
    operativeSignatureUrl: getStr(data, "operativeSignatureUrl"),
    supervisorDeclarationAccepted: getBool(data, "supervisorDeclarationAccepted"),
    notes: getStr(data, "notes"),
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSignatureUpload = async (file: File) => {
    const allowed = [".pdf", ".png", ".jpg", ".jpeg"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error("Allowed: PDF, PNG, JPG");
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch(`/api/pre-induction/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            sectionId: "declarations",
            fieldName: "operativeSignature",
            fileName: file.name,
            fileBase64: base64,
          }),
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        setForm((f) => ({ ...f, operativeSignatureUrl: json.fileUrl }));
        toast.success("Signature uploaded");
      };
      reader.readAsDataURL(file);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        operativeDeclarationAccepted: form.operativeDeclarationAccepted,
        operativeDeclarationAcceptedAt: form.operativeDeclarationAccepted
          ? new Date().toISOString()
          : null,
        operativeSignatureUrl: form.operativeSignatureUrl || null,
        supervisorDeclarationAccepted: form.supervisorDeclarationAccepted,
        supervisorDeclarationAcceptedAt: form.supervisorDeclarationAccepted
          ? new Date().toISOString()
          : null,
        notes: form.notes || null,
        updatedAt: new Date().toISOString(),
      };
      const res = await fetch(`/api/pre-induction/${userId}/declarations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      toast.success("Declarations saved");
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Declarations</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="operativeDeclarationAccepted"
            checked={form.operativeDeclarationAccepted}
            onChange={(e) =>
              setForm((f) => ({ ...f, operativeDeclarationAccepted: e.target.checked }))
            }
            className="rounded border-gray-300 text-blue-600"
          />
          <label htmlFor="operativeDeclarationAccepted" className="text-sm font-medium text-gray-700">
            Operative declaration accepted
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Operative signature</label>
          <div className="mt-1 flex gap-2">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              id="sig-file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleSignatureUpload(f);
                e.target.value = "";
              }}
            />
            <label
              htmlFor="sig-file"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Upload size={16} />
              {uploading ? "Uploading..." : form.operativeSignatureUrl ? "Replace" : "Upload"}
            </label>
            {form.operativeSignatureUrl && (
              <a href={form.operativeSignatureUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                View
              </a>
            )}
          </div>
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="supervisorDeclarationAccepted"
            checked={form.supervisorDeclarationAccepted}
            onChange={(e) =>
              setForm((f) => ({ ...f, supervisorDeclarationAccepted: e.target.checked }))
            }
            className="rounded border-gray-300 text-blue-600"
          />
          <label htmlFor="supervisorDeclarationAccepted" className="text-sm font-medium text-gray-700">
            Supervisor declaration accepted
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
