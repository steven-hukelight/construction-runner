"use client";

import React, { useState, useRef } from "react";
import { X, Upload, FileText } from "lucide-react";
import type { SubcontractorOperativeRow } from "./utils/buildSubcontractorComplianceDataset";

type Props = {
  operative: SubcontractorOperativeRow;
  onClose: () => void;
  onSuccess: () => void;
};

const ALLOWED_EXT = [".pdf", ".png", ".jpg", ".jpeg"];

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SubcontractorUploadMissingDocuments({ operative, onClose, onSuccess }: Props) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRefs = {
    passport: useRef<HTMLInputElement>(null),
    visa: useRef<HTMLInputElement>(null),
    proofOfAddress: useRef<HTMLInputElement>(null),
    certification: useRef<HTMLInputElement>(null),
    medical: useRef<HTMLInputElement>(null),
  };

  async function getDrawerData(): Promise<{
    rightToWork?: Record<string, unknown>;
    medical?: Record<string, unknown>;
    certifications?: { certifications?: Array<Record<string, unknown>> };
  }> {
    const r = await fetch(`/api/induction-compliance/drawer?userId=${encodeURIComponent(operative.userId)}`, {
      credentials: "include",
    });
    if (!r.ok) return {};
    const d = await r.json();
    return {
      rightToWork: (d?.sections?.rightToWork as Record<string, unknown>) ?? {},
      medical: (d?.sections?.medical as Record<string, unknown>) ?? {},
      certifications: (d?.sections?.certifications as { certifications?: Array<Record<string, unknown>> }) ?? {},
    };
  }

  async function handleUpload(
    sectionId: string,
    fieldName: string,
    file: File,
    updateApi: (url: string) => Promise<Response>
  ) {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      setError(`Invalid file type. Allowed: ${ALLOWED_EXT.join(", ")}`);
      return;
    }
    setError(null);
    setUploading(fieldName);
    try {
      const base64 = await toBase64(file);
      const uploadRes = await fetch("/api/pre-induction/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: operative.userId,
          sectionId,
          fieldName,
          fileName: file.name,
          fileBase64: base64,
        }),
        credentials: "include",
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(uploadData?.error ?? "Upload failed");
        return;
      }
      const fileUrl = uploadData.fileUrl;
      if (!fileUrl) {
        setError("No file URL returned");
        return;
      }
      const updateRes = await updateApi(fileUrl);
      if (!updateRes.ok) {
        const err = await updateRes.json();
        setError(err?.error ?? "Update failed");
        return;
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  function triggerFile(field: keyof typeof fileRefs) {
    fileRefs[field].current?.click();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Upload Missing Documents</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Upload documents for <span className="font-medium">{operative.name}</span>. The main contractor will verify
            them.
          </p>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          <div className="space-y-3">
            <input
              ref={fileRefs.passport}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                await handleUpload("rightToWork", "passport", file, async (url) => {
                  const { rightToWork } = await getDrawerData();
                  return fetch(`/api/pre-induction/${operative.userId}/right-to-work`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...rightToWork, passportUrl: url }),
                    credentials: "include",
                  });
                });
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => triggerFile("passport")}
              disabled={!!uploading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <FileText className="h-5 w-5 text-gray-500" />
              <span className="flex-1 text-left font-medium">Passport</span>
              {uploading === "passport" ? (
                <span className="text-sm text-gray-500">Uploading…</span>
              ) : (
                <Upload className="h-4 w-4 text-gray-400" />
              )}
            </button>

            <input
              ref={fileRefs.visa}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                await handleUpload("rightToWork", "visa", file, async (url) => {
                  const { rightToWork } = await getDrawerData();
                  return fetch(`/api/pre-induction/${operative.userId}/right-to-work`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...rightToWork, visaUrl: url }),
                    credentials: "include",
                  });
                });
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => triggerFile("visa")}
              disabled={!!uploading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <FileText className="h-5 w-5 text-gray-500" />
              <span className="flex-1 text-left font-medium">Visa</span>
              {uploading === "visa" ? (
                <span className="text-sm text-gray-500">Uploading…</span>
              ) : (
                <Upload className="h-4 w-4 text-gray-400" />
              )}
            </button>

            <input
              ref={fileRefs.proofOfAddress}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                await handleUpload("rightToWork", "proofOfAddress", file, async (url) => {
                  const { rightToWork } = await getDrawerData();
                  return fetch(`/api/pre-induction/${operative.userId}/right-to-work`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...rightToWork, proofOfAddressUrl: url }),
                    credentials: "include",
                  });
                });
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => triggerFile("proofOfAddress")}
              disabled={!!uploading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <FileText className="h-5 w-5 text-gray-500" />
              <span className="flex-1 text-left font-medium">Proof of Address</span>
              {uploading === "proofOfAddress" ? (
                <span className="text-sm text-gray-500">Uploading…</span>
              ) : (
                <Upload className="h-4 w-4 text-gray-400" />
              )}
            </button>

            <input
              ref={fileRefs.medical}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                await handleUpload("medical", "medicalCertificate", file, async (url) => {
                  const { medical } = await getDrawerData();
                  return fetch(`/api/pre-induction/${operative.userId}/medical`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...medical, medicalCertificateUrl: url }),
                    credentials: "include",
                  });
                });
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => triggerFile("medical")}
              disabled={!!uploading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <FileText className="h-5 w-5 text-gray-500" />
              <span className="flex-1 text-left font-medium">Medical Certificate</span>
              {uploading === "medical" ? (
                <span className="text-sm text-gray-500">Uploading…</span>
              ) : (
                <Upload className="h-4 w-4 text-gray-400" />
              )}
            </button>

            <input
              ref={fileRefs.certification}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading("certification");
                setError(null);
                try {
                  const base64 = await toBase64(file);
                  const uploadRes = await fetch("/api/pre-induction/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      userId: operative.userId,
                      sectionId: "certifications",
                      fieldName: "cert_0",
                      fileName: file.name,
                      fileBase64: base64,
                    }),
                    credentials: "include",
                  });
                  const uploadData = await uploadRes.json();
                  if (!uploadRes.ok) {
                    setError(uploadData?.error ?? "Upload failed");
                    return;
                  }
                  const fileUrl = uploadData.fileUrl;
                  const { certifications: certData } = await getDrawerData();
                  const existing = (certData?.certifications ?? []).map((c) => ({
                    type: c.type ?? "Other",
                    cardNumber: c.cardNumber ?? null,
                    fileUrl: c.fileUrl ?? null,
                    expiry: c.expiry ?? c.expiryDate ?? null,
                    verified: !!c.verified,
                    notes: c.notes ?? null,
                  }));
                  const newCert = {
                    type: "CSCS",
                    fileUrl,
                    expiry: null,
                    verified: false,
                  };
                  const updateRes = await fetch(`/api/pre-induction/${operative.userId}/certifications`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      certifications: [...existing, newCert],
                    }),
                    credentials: "include",
                  });
                  if (!updateRes.ok) {
                    setError("Failed to add certification");
                    return;
                  }
                  onSuccess();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Upload failed");
                } finally {
                  setUploading(null);
                  e.target.value = "";
                }
              }}
            />
            <button
              type="button"
              onClick={() => triggerFile("certification")}
              disabled={!!uploading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <FileText className="h-5 w-5 text-gray-500" />
              <span className="flex-1 text-left font-medium">Add Certification (e.g. CSCS)</span>
              {uploading === "certification" ? (
                <span className="text-sm text-gray-500">Uploading…</span>
              ) : (
                <Upload className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Allowed: PDF, PNG, JPG. Max 10MB. After upload, request verification from the main contractor.
          </p>
        </div>
      </div>
    </div>
  );
}
