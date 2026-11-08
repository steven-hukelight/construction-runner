"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Upload } from "lucide-react";
import { getPreInductionFileViewUrl } from "@/lib/preInductionFileUrl";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
import { CARD_TYPES, CSCS_LEVELS, type CardFlag } from "@/lib/competence/rules";

type Review = { checkedAt: string | null; checkedByName: string | null; flags: CardFlag[]; canCheck: boolean };

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
  const [cardLevel, setCardLevel] = useState(String(data?.cardLevel ?? data?.card_level ?? ""));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [checking, setChecking] = useState(false);

  const loadReview = useCallback(async () => {
    try {
      const res = await fetch(`/api/pre-induction/${userId}/competency-card/review`, {
        credentials: "include",
        cache: "no-store",
      });
      setReview(res.ok ? ((await res.json()) as Review) : null);
    } catch {
      setReview(null);
    }
  }, [userId]);

  useEffect(() => {
    void loadReview();
  }, [loadReview]);

  const setChecked = async (checked: boolean) => {
    setChecking(true);
    try {
      const res = await fetch(`/api/pre-induction/${userId}/competency-card/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked }),
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Could not save");
      setReview(json as Review);
      toast.success(checked ? "Card marked as checked" : "Check removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setChecking(false);
    }
  };

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
    e.target.value = "";
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
          cardLevel: cardType === "CSCS" ? cardLevel || null : null,
          cardNumber: cardNumber.trim() || null,
          expiry: expiry.trim() || null,
          fileUrl: fileUrl.trim() || null,
        }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      toast.success("Competency card saved");
      void loadReview();
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
        <h3 className="text-lg font-semibold text-gray-900">Competency card (Required)</h3>
        <p className="text-sm text-gray-500 mt-1">
          Provide your competency card details – card number or uploaded document.
        </p>
      </div>
      {review && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            {review.checkedAt ? (
              <span className="status-chip status-chip--ok">
                Checked{review.checkedByName ? ` by ${review.checkedByName}` : ""} · {formatDateTime(review.checkedAt)}
              </span>
            ) : (
              <span className="status-chip status-chip--warn">Not checked</span>
            )}
            {review.canCheck && (
              <button
                type="button"
                disabled={checking}
                onClick={() => void setChecked(!review.checkedAt)}
                className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
              >
                {checking ? "Saving…" : review.checkedAt ? "Remove check" : "Mark as checked"}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Look at the card itself (or the photo) and confirm the type, number and expiry match. Any change to the
            card clears the check. This is a supervisor check, not a CSCS database check.
          </p>
          {review.flags.filter((f) => f.code !== "not_checked").length > 0 && (
            <ul className="text-sm text-amber-800 list-disc pl-5">
              {review.flags
                .filter((f) => f.code !== "not_checked")
                .map((f) => (
                  <li key={f.code}>{f.message}</li>
                ))}
            </ul>
          )}
        </div>
      )}
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
        {cardType === "CSCS" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CSCS colour</label>
            <select value={cardLevel} onChange={(e) => setCardLevel(e.target.value)} className="input w-full">
              <option value="">Not recorded</option>
              {CSCS_LEVELS.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </div>
        )}
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
            <a href={getPreInductionFileViewUrl(fileUrl) ?? fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline">
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
        {saving ? "Saving…" : "Save Competency card"}
      </button>
    </div>
  );
}
