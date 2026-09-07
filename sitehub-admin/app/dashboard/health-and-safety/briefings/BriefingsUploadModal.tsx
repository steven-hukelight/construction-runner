"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { PortalOverlay } from "../../components/PortalOverlay";

type Site = { id: string; name?: string };

export default function BriefingsUploadModal() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [siteId, setSiteId] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open && file && !title) {
      setTitle(file.name.replace(/\.[^.]+$/, "") || file.name);
    }
  }, [open, file, title]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/sites", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr) => setSites(Array.isArray(arr) ? arr : []))
      .catch(() => setSites([]));
  }, [open]);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title.trim() || file.name);
      form.append("body", body.trim());
      form.append("siteId", siteId.trim());

      const res = await fetch("/api/briefings/upload", {
        method: "POST",
        body: form,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      setOpen(false);
      setFile(null);
      setTitle("");
      setBody("");
      setSiteId("");
      window.location.reload();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setOpen((v) => !v)}>
        {open ? "Cancel" : "Upload Briefing"}
      </Button>
      {open && (
        <PortalOverlay>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-xl lg:max-w-2xl card shadow-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <h3 className="text-lg font-semibold text-slate-900">Upload Toolbox Talk / Briefing</h3>
          <Input
            label="Title"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            placeholder="e.g. Slips, Trips & Falls"
          />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description (optional)</label>
            <textarea
              value={body}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Briefing summary or key points..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Site (optional)</label>
            <select
              value={siteId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSiteId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No site selected (company-wide)</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name ?? s.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">PDF File</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-4 py-3"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1"
            >
              {uploading ? "Uploading…" : "Upload"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                setFile(null);
                setTitle("");
                setBody("");
                setSiteId("");
              }}
            >
              Cancel
            </Button>
          </div>
          </div>
        </div>
        </PortalOverlay>
      )}
    </div>
  );
}
