"use client";

import Image from "next/image";
import { useState, useEffect, type ChangeEvent } from "react";
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-xl lg:max-w-2xl card shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Upload RAMS</h3>
          {companyLogoUrl && (
            <div className="mb-5 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-600 mb-2">Company logo (will appear on documents)</p>
              <div className="relative h-12 w-full max-w-[200px]">
                <Image src={companyLogoUrl} alt="Company logo" fill className="object-contain" sizes="200px" />
              </div>
            </div>
          )}
          <div className="space-y-5">
            <Input
              label="Site ID"
              value={siteId}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSiteId(e.target.value)}
            />

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">File</label>
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-2.5">
                <input
                  type="file"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-900 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={handleUpload} className="w-full">
                Upload
              </Button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
