"use client";

import { useState } from "react";
import { Shield, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";

interface PreInductionOverrideToggleProps {
  userId: string;
  adminPreInductionOverride: boolean;
  canEdit: boolean;
  onChanged?: () => void;
}

export default function PreInductionOverrideToggle({
  userId,
  adminPreInductionOverride,
  canEdit,
  onChanged,
}: PreInductionOverrideToggleProps) {
  const [value, setValue] = useState(adminPreInductionOverride);
  const [loading, setLoading] = useState(false);

  if (!canEdit) return null;

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pre-induction/${userId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPreInductionOverride: !value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      setValue(!value);
      toast.success("Pre-Induction Override updated");
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: "#2563EB" }}
        >
          <Shield size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Pre-Induction Override</h3>
            <span
              className="text-gray-400 cursor-help"
              title="Allows this operative to be assigned to a site without completing the Pre-Induction Profile. Only use this if the operative has been verified offline."
            >
              <HelpCircle size={14} />
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Allows this operative to be assigned to a site without completing the Pre-Induction
            Profile. Only use if verified offline.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggle}
              disabled={loading}
              role="switch"
              aria-checked={value}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 ${
                value ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                  value ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {value ? "Override enabled" : "Override disabled"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
