"use client";
import toast from "react-hot-toast";

import { useState, useEffect } from "react";
import Button from "../../components/ui/Button";
import { SitePicker } from "../../components/ui/SitePicker";

type Site = { id: string; name?: string };

export default function AddNearMissModal() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [siteId, setSiteId] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/sites", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        const sitesList = Array.isArray(list) ? list : [];
        setSites(sitesList);
        if (sitesList.length === 1) setSiteId((prev) => prev || sitesList[0].id);
      })
      .catch(() => setSites([]));
  }, [open]);

  async function handleSubmit() {
    if (!description.trim()) return;
    if (!siteId.trim()) {
      toast.error("Select a site. This report will only appear for that site.");
      return;
    }
    setSubmitting(true);
    try {
      const meRes = await fetch("/api/me", { credentials: "include" });
      const me = meRes.ok ? await meRes.json() : {};
      const reportedBy = me?.id ?? null;

      const res = await fetch("/api/near-miss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          description: description.trim(),
          status: "pending",
          siteId: siteId.trim(),
          reportedBy,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create report");
      }
      setOpen(false);
      setDescription("");
      setSiteId("");
      window.location.reload();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to create near miss report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setOpen((v) => !v)}>
        {open ? "Close" : "Add Near Miss"}
      </Button>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-xl lg:max-w-2xl card shadow-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <h3 className="text-lg font-semibold text-slate-900">Add Near Miss Report</h3>
            <p className="text-sm text-slate-600">
              Record a safety incident that did not result in injury. Used for tracking and prevention.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the incident, location, and circumstances..."
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Site <span className="text-red-600">*</span>
              </label>
              <SitePicker
                sites={sites}
                value={siteId}
                onChange={setSiteId}
                placeholder="Select site…"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={!description.trim() || !siteId.trim() || submitting}
                className="flex-1"
              >
                {submitting ? "Saving…" : "Save Report"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  setDescription("");
                  setSiteId("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
