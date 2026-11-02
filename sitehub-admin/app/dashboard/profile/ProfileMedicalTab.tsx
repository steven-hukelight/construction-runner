"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
import { openDocumentUrl } from "@/lib/openDocumentUrl";

type MedicalRecord = {
  id: string;
  title?: string;
  notes?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt?: string;
};

async function loadMedicalRecords(userId: string, signal: AbortSignal): Promise<MedicalRecord[]> {
  const [medRes, myInfoRes] = await Promise.all([
    fetch(`/api/users/${encodeURIComponent(userId)}/medical`, { credentials: "include", signal }).catch(() => null),
    fetch("/api/me/info", { credentials: "include", signal }).catch(() => null),
  ]);
  const fileRecords = medRes?.ok ? await medRes.json().catch(() => []) : [];
  const mappedFiles = (Array.isArray(fileRecords) ? fileRecords : []).map((d: Record<string, unknown>) => ({
    id: String(d.id ?? ""),
    title: (d.title as string) ?? undefined,
    notes: (d.notes as string) ?? undefined,
    fileUrl: (d.file_url as string) ?? (d.fileUrl as string),
    fileName: (d.file_name as string) ?? (d.fileName as string),
    createdAt: (d.created_at as string) ?? (d.createdAt as string),
  }));

  const myInfo = myInfoRes?.ok ? await myInfoRes.json().catch(() => null) : null;
  const medical = (myInfo?.medical ?? null) as Record<string, unknown> | null;
  const declaration = String(medical?.medicalDeclaration ?? medical?.medical_declaration ?? "").trim();
  const hasIssues = medical?.hasMedicalIssues ?? medical?.has_medical_issues;
  const myInfoRows: MedicalRecord[] = [];
  if (declaration || hasIssues != null) {
    myInfoRows.push({
      id: "my-info-medical",
      title: "Medical declaration",
      notes:
        [
          hasIssues === true ? "Has medical issues: Yes" : hasIssues === false ? "Has medical issues: No" : null,
          declaration || null,
        ]
          .filter(Boolean)
          .join("\n") || "Record on file",
    });
  }
  return [...myInfoRows, ...mappedFiles];
}

export default function ProfileMedicalTab({
  userId,
  onOpenInduction,
}: {
  userId: string;
  onOpenInduction: () => void;
}) {
  const [medical, setMedical] = useState<MedicalRecord[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    loadMedicalRecords(userId, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setMedical(rows);
      })
      .catch((error) => {
        if (!controller.signal.aborted) console.error("Error loading medical records:", error);
      });
    return () => controller.abort();
  }, [userId]);

  return (
    <div className="card">
      <h3 className="font-semibold text-slate-900 mb-6">Medical History</h3>
      {medical.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 mb-2">No medical records found</p>
          <p className="text-sm text-slate-400 mb-4">
            Your medical declaration lives in My info / induction. Uploaded medical files are managed by administrators.
          </p>
          <Link href="/dashboard/profile" className="text-sm text-blue-600 hover:underline" onClick={onOpenInduction}>
            Open induction / My info
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {medical.map((record) => (
            <div 
              key={record.id}
              className="p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-200 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <FileText size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{record.title || 'Medical Record'}</div>
                    {record.createdAt && (
                      <div className="text-xs text-slate-500">
                        {formatDateTime(record.createdAt)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {record.notes && (
                <div className="mb-3">
                  <div className="text-sm text-slate-600">{record.notes}</div>
                </div>
              )}
              {record.fileUrl && record.fileName && (
                <div className="pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => openDocumentUrl(record.fileUrl!)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <FileText size={14} />
                    {record.fileName}
                    <span className="text-slate-400">↗</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
