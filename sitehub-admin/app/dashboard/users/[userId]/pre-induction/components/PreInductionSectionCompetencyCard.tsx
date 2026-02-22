"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { CreditCard, Upload } from "lucide-react";

const CARD_TYPES = ["CSCS", "CPCS", "ECITB", "ECSC", "Gas Safe", "JIB", "CITB", "Other"];

interface PreInductionSectionCompetencyCardProps {
  userId: string;
  data: Record<string, unknown> | null;
  onSaved?: () => void;
}

export default function PreInductionSectionCompetencyCard({
  userId,
  data,
  onSaved,
}: PreInductionSectionCompetencyCardProps) {
  const [cardType, setCardType] = useState((data?.cardType ?? data?.card_type ?? "CSCS") as string);
  const [cardNumber, setCardNumber] = useState(String(data?.cardNumber ?? data?.card_number ?? ""));
  const [expiry, setExpiry] = useState(
    typeof data?.expiry === "string" ? data.expiry.slice(0, 10) : ""
  );
  const [fileUrl, setFileUrl] = useState(String(data?.fileUrl ?? data?.file_url ?? ""));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
            sectionId: "competencyCard",
            fieldName: "competency_card",
            fileName: file.name,
            fileBase64: base64,
          }),
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        setFileUrl(json.fileUrl ?? "");
        toast.success("File uploaded");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!cardNumber.trim() && !fileUrl.trim()) {
      toast.error("Card number or uploaded file is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/pre-induction/${userId}/competency-card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardType,
          cardNumber: cardNumber.trim() || null,
          expiry: expiry.trim() || null,
          fileUrl: fileUrl.trim() || null,
        }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      toast.success("Competency card saved");
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Competency Card (Required)</h3>
        <p className="text-sm text-gray-500 mt-1">
          Provide your competency card details – card number or uploaded document.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Card type</label>
          <select
            value={cardType}
            onChange={(e) => setCardType(e.target.value)}
            className="input w-full"
          >
            {CARD_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Card number</label>
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="e.g. 12345678"
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry (optional)</label>
          <input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="input w-full"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Upload document (optional)</label>
        <div className="flex gap-2 items-center">
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
            id="competency-upload"
          />
          <label
            htmlFor="competency-upload"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm"
          >
            <Upload size={16} />
            {uploading ? "Uploading…" : "Choose file"}
          </label>
          {fileUrl && (
            <a href={fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline">
              View uploaded
            </a>
          )}
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={saving || (!cardNumber.trim() && !fileUrl.trim())}
        className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Competency Card"}
      </button>
    </div>
  );
}
