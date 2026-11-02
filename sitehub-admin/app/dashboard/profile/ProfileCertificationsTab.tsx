"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Award, FileText, Upload } from "lucide-react";
import { formatDate } from "@/app/DisplayPreferencesProvider";
import { openDocumentUrl } from "@/lib/openDocumentUrl";

type Certification = {
  id: string;
  name: string;
  description: string;
  cardNumber?: string;
  issuedDate?: string;
  expiryDate: string;
  status: "valid" | "expiring" | "expired";
  color: "emerald" | "blue" | "amber" | "red";
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
};

const EMPTY_FORM = {
  name: "",
  description: "",
  cardNumber: "",
  issuedDate: "",
  expiryDate: "",
  file: null as File | null,
};

async function uploadCertificationFile(userId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("userId", userId);
  const res = await fetch("/api/certifications/upload", { method: "POST", credentials: "include", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Upload failed");
  }
  return (await res.json()) as { fileUrl?: string; fileName?: string };
}

export default function ProfileCertificationsTab({ userId }: { userId: string }) {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [showCertModal, setShowCertModal] = useState(false);
  const [certForm, setCertForm] = useState(EMPTY_FORM);

  const loadCertifications = useCallback(async () => {
    try {
      const certRes = await fetch(`/api/certifications?userId=${encodeURIComponent(userId)}`, { credentials: "include" }).catch(() => null);
      if (!certRes) return;
      const data = certRes.ok ? await certRes.json().catch(() => []) : [];
      setCertifications((Array.isArray(data) ? data : []).map((d: Record<string, unknown>) => ({
        id: String(d.id ?? ""),
        name: String(d.name ?? d.type ?? ""),
        description: String(d.description ?? ""),
        cardNumber: (d.cardNumber as string) ?? undefined,
        issuedDate: (d.issuedDate as string) ?? (d.issued_at as string) ?? (d.issuedAt as string),
        expiryDate: (d.expiryDate as string) ?? (d.expires_at as string) ?? (d.expiresAt as string) ?? "",
        status: (d.status as Certification["status"]) ?? "valid",
        color: (d.color as Certification["color"]) ?? "emerald",
        fileUrl: (d.fileUrl as string) ?? (d.attachment_url as string),
        fileName: d.fileName as string | undefined,
        uploadedAt: (d.uploadedAt as string) ?? (d.updated_at as string),
      })));
    } catch (error) {
      console.error("Error loading certifications:", error);
    }
  }, [userId]);

  useEffect(() => {
    void loadCertifications();
  }, [loadCertifications]);

  async function addCertification() {
    if (!certForm.name || !certForm.description || !certForm.expiryDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      let fileUrl = "";
      let fileName = "";
      if (certForm.file) {
        const uploadData = await uploadCertificationFile(userId, certForm.file);
        fileUrl = uploadData.fileUrl || "";
        fileName = uploadData.fileName || certForm.file.name;
      }

      const res = await fetch("/api/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          name: certForm.name,
          description: certForm.description,
          cardNumber: certForm.cardNumber || "",
          issuedDate: certForm.issuedDate || "",
          expiryDate: certForm.expiryDate,
          fileUrl: fileUrl || undefined,
          fileName: fileName || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to add certification");
      }

      setCertForm(EMPTY_FORM);
      setShowCertModal(false);
      toast.success("Certification added");
      await loadCertifications();
    } catch (error: unknown) {
      console.error("Error adding certification:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to add certification: " + message);
    }
  }

  async function deleteCertification(certId: string) {
    if (!confirm("Are you sure you want to delete this certification?")) return;
    try {
      const res = await fetch("/api/certifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          path: `users/${userId}/certifications/${certId}`,
          parentCollection: "users",
          parentId: userId,
          id: certId,
        }),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Certification deleted");
      void loadCertifications();
    } catch (error) {
      console.error("Error deleting certification:", error);
      toast.error("Failed to delete certification");
    }
  }

  async function handleFileUpload(certId: string, file: File) {
    try {
      const { fileUrl } = await uploadCertificationFile(userId, file);
      const patchRes = await fetch("/api/certifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          path: `users/${userId}/certifications/${certId}`,
          parentCollection: "users",
          parentId: userId,
          id: certId,
          attachmentUrl: fileUrl,
        }),
      });
      if (!patchRes.ok) throw new Error("Update failed");
      toast.success("File uploaded");
      void loadCertifications();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    }
  }

  function triggerFileUpload(certId: string) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.pdf,.doc,.docx";
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement | null)?.files?.[0];
      if (file) void handleFileUpload(certId, file);
    };
    input.click();
  }

  return (
    <>
      <div className="card">
        <h3 className="font-semibold text-slate-900 mb-6">Professional Certification & Training</h3>
        {certifications.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Award size={24} className="text-slate-400" />
            </div>
            <p className="text-slate-500 mb-4">No certifications added yet</p>
            <button onClick={() => setShowCertModal(true)} className="button">
              + Add Your First Certification
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {certifications.map((cert) => (
                <div 
                  key={cert.id}
                  className={`p-4 rounded-xl border ${
                    cert.status === 'expired' ? 'border-red-200 bg-red-50' :
                    cert.status === 'expiring' ? 'border-amber-200 bg-amber-50' :
                    'border-gray-100 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        cert.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                        cert.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                        cert.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        <Award size={18} />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{cert.name}</div>
                        <div className="text-sm text-slate-500">{cert.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        cert.status === 'expired' ? 'bg-red-200 text-red-800' :
                        cert.status === 'expiring' ? 'bg-amber-200 text-amber-800' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          cert.status === 'expired' ? 'bg-red-500' :
                          cert.status === 'expiring' ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}></span>
                        {cert.status === 'expired' ? 'Expired' :
                         cert.status === 'expiring' ? 'Expiring Soon' :
                         'Valid'}
                      </span>
                      <button 
                        onClick={() => deleteCertification(cert.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete certification"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    {cert.cardNumber && (
                      <div>
                        <div className="text-slate-500">Card Number</div>
                        <div className="font-medium text-slate-900">{cert.cardNumber}</div>
                      </div>
                    )}
                    {cert.issuedDate && (
                      <div>
                        <div className="text-slate-500">Issued</div>
                        <div className="font-medium text-slate-900">
                          {formatDate(cert.issuedDate)}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-slate-500">Expires</div>
                      <div className={`font-medium ${
                        cert.status === 'expired' ? 'text-red-700' :
                        cert.status === 'expiring' ? 'text-amber-700' :
                        'text-slate-900'
                      }`}>
                        {formatDate(cert.expiryDate)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    {cert.fileUrl && cert.fileName ? (
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => openDocumentUrl(cert.fileUrl!)}
                          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <FileText size={14} />
                          {cert.fileName}
                          <span className="text-slate-400">↗</span>
                        </button>
                        <button
                          onClick={() => triggerFileUpload(cert.id)}
                          className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                        >
                          Replace
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => triggerFileUpload(cert.id)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-colors duration-[120ms]"
                      >
                        <Upload size={14} />
                        Upload Evidence
                      </button>
                    )}
                    {cert.uploadedAt && (
                      <div className="text-xs text-slate-400 mt-1">
                        Uploaded {formatDate(cert.uploadedAt)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-gray-100">
              <button onClick={() => setShowCertModal(true)} className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-colors duration-[120ms]">
                + Add New Certification
              </button>
            </div>
          </>
        )}
      </div>
      {showCertModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Add Certification</h3>
              <button
                onClick={() => setShowCertModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="text-2xl leading-none">×</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Certification Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., CSCS Card"
                  value={certForm.name}
                  onChange={(e) => setCertForm({ ...certForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Construction Skills Certification Scheme"
                  value={certForm.description}
                  onChange={(e) => setCertForm({ ...certForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Card Number (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., 12345678"
                  value={certForm.cardNumber}
                  onChange={(e) => setCertForm({ ...certForm, cardNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Issued Date (optional)
                  </label>
                  <input
                    type="date"
                    value={certForm.issuedDate}
                    onChange={(e) => setCertForm({ ...certForm, issuedDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={certForm.expiryDate}
                    onChange={(e) => setCertForm({ ...certForm, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Upload Document/Image (optional)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => setCertForm({ ...certForm, file: e.target.files?.[0] || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {certForm.file && (
                  <p className="text-xs text-slate-500 mt-1">
                    Selected: {certForm.file.name}
                  </p>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200">
              <button
                onClick={() => setShowCertModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-colors duration-[120ms]"
              >
                Cancel
              </button>
              <button
                onClick={addCertification}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-[120ms]"
              >
                Add Certification
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
