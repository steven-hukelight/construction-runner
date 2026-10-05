"use client";
import toast from "react-hot-toast";

import { useState, useEffect } from "react";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";
import { SitePicker } from "../components/ui/SitePicker";
import { Copy, Check } from "lucide-react";

type Site = { id: string; name?: string };

export default function InviteSubcontractorModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [siteId, setSiteId] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && sites.length === 0) {
      setLoading(true);
      fetch("/api/sites")
        .then((r) => r.json())
        .then((data) => {
          setSites(Array.isArray(data) ? data : []);
          if (Array.isArray(data) && data.length) setSiteId(data[0].id ?? "");
        })
        .finally(() => setLoading(false));
    }
  }, [open, sites.length]);

  useEffect(() => {
    if (!open) {
      setCode(null);
      setSiteId(sites[0]?.id ?? "");
    }
  }, [open, sites]);

  async function handleCreate() {
    if (!siteId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create invite code");
      setCode(data.code);
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create invite code");
    } finally {
      setCreating(false);
    }
  }

  function copyCode() {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite Subcontractor">
      <div className="space-y-6">
        {code ? (
          <>
            <p className="text-gray-600 text-sm">
              Share this code with the subcontractor. They will use it when signing up or in the app.
            </p>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <span className="font-mono text-xl font-bold text-gray-900 tracking-wider">{code}</span>
              <button
                type="button"
                onClick={copyCode}
                className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                title="Copy code"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setCode(null); }}>
                Create another
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Site to link
              </label>
              <SitePicker
                sites={sites}
                value={siteId}
                onChange={setSiteId}
                disabled={loading}
                placeholder="Select site…"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating || !siteId}>
                {creating ? "Creating…" : "Generate invite code"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
