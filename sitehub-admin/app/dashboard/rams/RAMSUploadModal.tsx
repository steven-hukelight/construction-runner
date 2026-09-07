"use client";

import Image from "next/image";
import { useState, useEffect, type ChangeEvent } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { PortalOverlay } from "../components/PortalOverlay";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";
import { RAMS_MAX_UPLOAD_BYTES, RAMS_MAX_UPLOAD_LABEL } from "@/lib/ramsUploadLimits";

type Site = { id: string; name?: string };

export default function RAMSUploadModal() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [siteId, setSiteId] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/sites", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr) => setSites(Array.isArray(arr) ? arr : []))
      .catch(() => setSites([]));
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => d?.companyId)
      .then((cid) =>
        cid ? fetch(`/api/companies/${cid}`, { credentials: "include" }).then((r) => r.json()) : null
      )
      .then((company) => {
        const lu = company?.logoUrl ?? company?.logo_url;
        if (lu) setCompanyLogoUrl(String(lu));
      })
      .catch(() => {});
  }, [open]);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !title.trim()) {
      const base = f.name.replace(/\.pdf$/i, "").trim();
      setTitle(base || f.name);
    }
  }

  async function handleUpload() {
    if (!file) return;
    if (file.size > RAMS_MAX_UPLOAD_BYTES) {
      alert(`File too large (max ${RAMS_MAX_UPLOAD_LABEL})`);
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("siteId", siteId.trim() || "");
      form.append("title", title.trim() || file.name.replace(/\.pdf$/i, "") || file.name);
      form.append("description", description.trim());
      const impersonatedCompanyId = getCompanyIdFromClient();
      if (impersonatedCompanyId) {
        form.append("companyId", impersonatedCompanyId);
      }

      const res = await fetch("/api/rams/upload", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(typeof err?.error === "string" ? err.error : "Upload failed");
        return;
      }
      setOpen(false);
      setFile(null);
      setTitle("");
      setDescription("");
      setSiteId("");
      window.location.reload();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-start gap-1">
        <Button onClick={() => setOpen((v) => !v)}>{open ? "Close" : "Upload RAMS"}</Button>
        <p className="text-xs text-slate-500">Max PDF size: {RAMS_MAX_UPLOAD_LABEL}</p>
      </div>
      {open && (
        <PortalOverlay>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-xl lg:max-w-2xl card shadow-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Upload RAMS</h3>
            {companyLogoUrl && (
              <div className="mb-5 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-600 mb-2">Company logo (will appear on documents)</p>
                <div className="relative h-12 w-full max-w-[200px]">
                  <Image
                    src={companyLogoUrl}
                    alt="Company logo"
                    fill
                    className="object-contain"
                    sizes="200px"
                  />
                </div>
              </div>
            )}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Site (optional)</label>
                <select
                  value={siteId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setSiteId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No site selected</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name ?? s.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Document title <span className="text-red-600">*</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Site X – Excavation RAMS"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Details</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Scope, revision notes, or summary for supervisors (optional)"
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">PDF file</label>
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-2.5">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={onFileChange}
                    className="block w-full text-sm text-gray-900 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={handleUpload} className="w-full" disabled={uploading || !file}>
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
              </div>
            </div>
          </div>
        </div>
        </PortalOverlay>
      )}
    </div>
  );
}
