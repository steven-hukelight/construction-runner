"use client";

import toast from "react-hot-toast";
import { Download, Trash2 } from "lucide-react";

export default function ProfilePrivacyTab({
  userId,
  restricted,
  onRestrictedChange,
}: {
  userId: string;
  restricted: boolean;
  onRestrictedChange: (value: boolean) => void;
}) {
  return (
    <div className="card space-y-6">
      <h3 className="font-semibold text-slate-900">GDPR. Your Data Rights</h3>
      <p className="text-sm text-slate-600">
        Your data is collected solely for the purposes of site access, safety compliance, induction, RAMS acceptance, and legal health &amp; safety obligations. It is not used for marketing or profiling.
      </p>
      <p className="text-xs text-slate-500">
        <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Terms of Service</a>
        {" · "}
        <a href="/legal/privacy-and-security" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Full Privacy & Security Policy</a>
      </p>
      <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
        <h4 className="font-medium text-slate-900 mb-2">Right to Restrict Processing</h4>
        <p className="text-sm text-slate-600 mb-3">When enabled, only admins can view sensitive fields (NI number, medical notes).</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={restricted}
            onChange={async (e) => {
              const v = e.target.checked;
              onRestrictedChange(v);
              try {
                const r = await fetch("/api/profiles", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId, restrictNonEssentialProcessing: v }),
                  credentials: "include",
                });
                if (!r.ok) throw new Error("Failed to save");
              } catch (err: unknown) {
                onRestrictedChange(!v);
                const message = err instanceof Error ? err.message : "Failed to update setting";
                toast.error(message);
              }
            }}
            className="rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm font-medium text-slate-700">Restrict non-essential processing</span>
        </label>
      </div>
      <div className="space-y-4">
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
          <h4 className="font-medium text-slate-900 mb-2">Right to Access</h4>
          <p className="text-sm text-slate-600 mb-3">Download a copy of your Pre-Induction, Induction, and Profile data.</p>
          <button
            onClick={async () => {
              try {
                const r = await fetch("/api/gdpr/download-my-data", { credentials: "include" });
                if (!r.ok) throw new Error("Failed to download");
                const json = await r.json();
                const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `my-data-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
                toast.success("Data downloaded.");
              } catch (e) {
                toast.error("Failed to download: " + (e instanceof Error ? e.message : "Unknown error"));
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            <Download size={16} />
            Download My Data
          </button>
        </div>
        <div className="p-4 rounded-xl border border-red-200 bg-red-50">
          <h4 className="font-medium text-slate-900 mb-2">Right to Erasure</h4>
          <p className="text-sm text-slate-600 mb-3">
            Delete your account and personal data. Legally required H&S records (inductions, RAMS acceptance, training) will be retained for compliance.
          </p>
          <button
            onClick={async () => {
              if (!confirm("Are you sure? This will anonymise your account. H&S records will be retained.")) return;
              try {
                const r = await fetch("/api/gdpr/delete-account", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ confirm: true }),
                  credentials: "include",
                });
                const data = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(data.error || "Failed");
                toast.success(data.message || "Account deleted.");
                window.location.href = "/admin/login";
              } catch (e) {
                toast.error("Failed: " + (e instanceof Error ? e.message : "Unknown error"));
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
          >
            <Trash2 size={16} />
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
}
