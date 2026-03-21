"use client";

import { useState, useEffect, memo } from "react";
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

interface PreInductionSectionDeclarationsProps {
  userId: string;
  data: Record<string, unknown> | null;
  onSaved?: () => void;
  /** Must be true before operative can accept declaration. Requires Personal, Right to Work, Competency Card, Medical all complete. */
  canAcceptDeclaration?: boolean;
}

function PreInductionSectionDeclarations({
  userId,
  data,
  onSaved,
  canAcceptDeclaration = true,
}: PreInductionSectionDeclarationsProps) {
  const initialAccepted = getBool(data, "operativeDeclarationAccepted");
  const [accepted, setAccepted] = useState(initialAccepted);
  const [form, setForm] = useState({
    operativeDeclarationAccepted: initialAccepted,
    operativeSignatureUrl: getStr(data, "operativeSignatureUrl"),
    supervisorDeclarationAccepted: getBool(data, "supervisorDeclarationAccepted"),
    notes: getStr(data, "notes"),
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const v = getBool(data, "operativeDeclarationAccepted");
    setAccepted(v);
    setForm((f) => (f.operativeDeclarationAccepted !== v ? { ...f, operativeDeclarationAccepted: v } : f));
  }, [data]);

  const handleSignatureUpload = async (file: File) => {
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
        reader.onload = () => {
          const result = (reader.result as string).split(",")[1];
          resolve(result ?? "");
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!accepted && form.operativeDeclarationAccepted) return;
    if (form.operativeDeclarationAccepted && !canAcceptDeclaration) {
      toast.error("Complete all required sections (Personal, Right to Work, Competency Card, Medical) before accepting the declaration.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        operativeDeclarationAccepted: canAcceptDeclaration && accepted ? form.operativeDeclarationAccepted : false,
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
      if (!res.ok) {
        const msg = Array.isArray(json.missing) && json.missing.length > 0
          ? `Complete these sections first: ${json.missing.join("; ")}`
          : (json.error ?? "Failed to save");
        throw new Error(msg);
      }
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
      {!canAcceptDeclaration && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <strong>Complete all required sections first.</strong> Personal, Right to Work, Competency Card, and Medical must all be filled in and verified (green status) before you can accept the operative declaration.
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="operativeDeclarationAccepted"
            checked={form.operativeDeclarationAccepted}
            onChange={(e) => {
              if (!canAcceptDeclaration && e.target.checked) return;
              const checked = e.target.checked;
              setAccepted(checked);
              setForm((f) => ({ ...f, operativeDeclarationAccepted: checked }));
            }}
            disabled={!canAcceptDeclaration}
            className="rounded border-gray-300 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label
            htmlFor="operativeDeclarationAccepted"
            className={`text-sm font-medium ${canAcceptDeclaration ? "text-gray-700" : "text-gray-500"}`}
          >
            Operative declaration accepted
            {!canAcceptDeclaration && (
              <span className="ml-1 text-amber-600">(Complete required sections above first)</span>
            )}
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
              <a href={getPreInductionFileViewUrl(form.operativeSignatureUrl) ?? form.operativeSignatureUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
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
          disabled={saving || !accepted}
          className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#2563EB" }}
        >
          {saving ? "Saving..." : "Accept Declaration"}
        </button>
      </div>
    </div>
  );
}

export default memo(PreInductionSectionDeclarations);
