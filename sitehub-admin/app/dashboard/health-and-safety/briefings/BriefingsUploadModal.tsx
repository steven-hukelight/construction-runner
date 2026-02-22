"use client";

import { useState, useEffect } from "react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

export default function BriefingsUploadModal() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [siteId, setSiteId] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open && file && !title) {
      setTitle(file.name.replace(/\.[^.]+$/, "") || file.name);
    }
  }, [open, file, title]);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title.trim() || file.name);
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
        <div className="card w-full md:max-w-xl p-6 space-y-5">
          <h3 className="text-lg font-semibold text-slate-900">Upload Toolbox Talk / Briefing</h3>
          <Input
            label="Title"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            placeholder="e.g. Slips, Trips & Falls"
          />
          <Input
            label="Site ID (optional)"
            value={siteId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSiteId(e.target.value)}
            placeholder="Leave blank for company-wide"
          />
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
                setSiteId("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
