"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function RAMSUploadModal() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [siteId, setSiteId] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => d?.companyId)
      .then((cid) => cid ? fetch(`/api/companies/${cid}`).then((r) => r.json()) : null)
      .then((company) => company?.logoUrl && setCompanyLogoUrl(company.logoUrl))
      .catch(() => {});
  }, [open]);

  async function handleUpload() {
    if (!file) return;

    const form = new FormData();
    form.append("file", file);
    form.append("siteId", siteId);
    form.append("uploadedBy", "admin");

    await fetch("/api/rams/upload", {
      method: "POST",
      body: form,
    });

    setOpen(false);
    window.location.reload();
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setOpen((v) => !v)}>
        {open ? "Close" : "Upload RAMS"}
      </Button>
      {open && (
        <div className="card w-full md:max-w-xl">
          <h3 className="text-lg font-semibold text-white mb-6">Upload RAMS</h3>
          {companyLogoUrl && (
            <div className="mb-5 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
              <p className="text-xs text-gray-400 mb-2">Company logo (will appear on documents)</p>
              <img src={companyLogoUrl} alt="Company logo" className="h-12 object-contain" />
            </div>
          )}
          <div className="space-y-5">
            <Input
              label="Site ID"
              value={siteId}
              onChange={(e: any) => setSiteId(e.target.value)}
            />

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">File</label>
              <input
                type="file"
                onChange={(e: any) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-200"
              />
            </div>

            <div className="pt-2">
              <Button onClick={handleUpload} className="w-full">
                Upload
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
