"use client";

import React, { useState } from "react";
import { X, CheckCircle } from "lucide-react";
import type { SubcontractorOperativeRow } from "./utils/buildSubcontractorComplianceDataset";

type Props = {
  operative: SubcontractorOperativeRow;
  onClose: () => void;
  onSuccess: () => void;
};

const SECTIONS = [
  { id: "rightToWork", label: "Right to Work" },
  { id: "certifications", label: "Certifications" },
  { id: "medical", label: "Medical" },
] as const;

export default function SubcontractorRequestVerification({ operative, onClose, onSuccess }: Props) {
  const [selectedSection, setSelectedSection] = useState<string>("rightToWork");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/subcontractor/request-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: operative.userId, section: selectedSection }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Request failed");
        return;
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Request Verification</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Request the main contractor to verify documents for <span className="font-medium">{operative.name}</span>.
            Once requested, the section will be marked as Pending Verification and cannot be edited until verified or
            rejected.
          </p>

          {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section to verify</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900"
            >
              {SECTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <CheckCircle className="h-5 w-5" />
            {loading ? "Sending…" : "Request Verification"}
          </button>
        </div>
      </div>
    </div>
  );
}
