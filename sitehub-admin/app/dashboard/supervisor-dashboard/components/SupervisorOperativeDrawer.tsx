"use client";

import React, { useEffect, useState } from "react";
import { X, FileText } from "lucide-react";
import SupervisorInductionStatusBadge from "./SupervisorInductionStatusBadge";
import SupervisorActions from "./SupervisorActions";
import RAMSStatusBadge from "../../components/RAMSStatusBadge";
import type { SupervisorOperativeRow } from "../utils/buildSupervisorComplianceDataset";
import type { RamsStatus } from "@/lib/ramsCompliance";

type DrawerData = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    companyName: string | null;
    preInductionStatus: string;
    adminPreInductionOverride: boolean;
    complianceScore: number | null;
  };
  sections: Record<string, Record<string, unknown> | null>;
  inductionHistory: Array<{ siteId: string; siteName: string; status: string; completedAt: string | null; grandfathered?: boolean }>;
  rams?: {
    status: RamsStatus;
    currentVersion: string | null;
    acceptedVersion: string | null;
    acceptedAt: string | null;
    fileUrl: string | null;
    title: string | null;
  };
};

type Props = {
  operative: SupervisorOperativeRow | null;
  siteId: string;
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
};

export default function SupervisorOperativeDrawer({
  operative,
  siteId,
  isOpen,
  onClose,
  isMobile = false,
}: Props) {
  const [data, setData] = useState<DrawerData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !operative) {
      setData(null);
      return;
    }
    setLoading(true);
    fetch(
      `/api/supervisor/operative-drawer?userId=${encodeURIComponent(operative.operativeId)}&siteId=${encodeURIComponent(siteId)}`,
      { credentials: "include" }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [isOpen, operative, siteId]);

  if (!isOpen) return null;

  const drawerClass = isMobile
    ? "fixed inset-0 z-50 bg-white overflow-y-auto"
    : "fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-xl border-l border-gray-200 z-50 overflow-y-auto";

  return (
    <div className={drawerClass}>
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
        <h2 className="text-lg font-semibold text-gray-900">Operative Details</h2>
        <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        )}

        {!loading && data && (
          <>
            <Section title="Summary">
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Name:</span> {data.user.name ?? "—"}</p>
                <p><span className="font-medium">Email:</span> {data.user.email ?? "—"}</p>
                <p><span className="font-medium">Company:</span> {data.user.companyName ?? "—"}</p>
                <p><span className="font-medium">Pre-Induction:</span> {data.user.preInductionStatus.replace("_", " ")}</p>
                {data.user.complianceScore != null && (
                  <p><span className="font-medium">Score:</span> {data.user.complianceScore}/100</p>
                )}
                {operative && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <SupervisorInductionStatusBadge status={operative.inductionStatus} />
                    <RAMSStatusBadge status={operative.ramsStatus} />
                    {operative.grandfathered && <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">Grandfathered</span>}
                    {operative.overrideApplied && <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800">Override</span>}
                  </div>
                )}
              </div>
            </Section>

            <Section title="Personal Details (read-only)">
              {data.sections.personal ? (
                <div className="text-sm space-y-1">
                  <p>Name: {(data.sections.personal.fullName as string) ?? "—"}</p>
                  <p>Email: {(data.sections.personal.email as string) ?? "—"}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Not completed</p>
              )}
            </Section>

            <Section title="Right to Work (read-only)">
              {data.sections.rightToWork ? (
                <p className="text-sm">
                  Verified: {data.sections.rightToWork.rightToWorkVerified ? "Yes" : "No"}
                </p>
              ) : (
                <p className="text-sm text-gray-500">Not completed</p>
              )}
            </Section>

            <Section title="Certifications (read-only)">
              {(data.sections.certifications as Record<string, unknown>)?.certifications ? (
                <p className="text-sm">
                  {((data.sections.certifications as Record<string, unknown>).certifications as unknown[]).length} certification(s)
                </p>
              ) : (
                <p className="text-sm text-gray-500">No certifications</p>
              )}
            </Section>

            <Section title="Medical (read-only)">
              {data.sections.medical ? (
                <p className="text-sm">Verified: {data.sections.medical.medicalVerified ? "Yes" : "No"}</p>
              ) : (
                <p className="text-sm text-gray-500">Not completed</p>
              )}
            </Section>

            <Section title="Training (read-only)">
              {(data.sections.training as Record<string, unknown>)?.trainingRecords ? (
                <p className="text-sm">
                  {((data.sections.training as Record<string, unknown>).trainingRecords as unknown[]).length} training record(s)
                </p>
              ) : (
                <p className="text-sm text-gray-500">No training records</p>
              )}
            </Section>

            {data.rams && (
              <Section title="RAMS">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <RAMSStatusBadge status={data.rams.status} />
                  </div>
                  {data.rams.currentVersion && (
                    <p><span className="font-medium">Current version:</span> {data.rams.currentVersion}</p>
                  )}
                  {data.rams.acceptedVersion && (
                    <p><span className="font-medium">Accepted version:</span> {data.rams.acceptedVersion}</p>
                  )}
                  {data.rams.acceptedAt && (
                    <p><span className="font-medium">Accepted at:</span> {new Date(data.rams.acceptedAt).toLocaleString()}</p>
                  )}
                  {data.rams.fileUrl && (
                    <a
                      href={data.rams.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      View RAMS
                    </a>
                  )}
                  {(data.rams.status === "pending" || data.rams.status === "outdated") && (
                    <p className="text-amber-700 text-xs">Request the operative to accept RAMS (mobile app).</p>
                  )}
                </div>
              </Section>
            )}

            <Section title="Declarations (read-only)">
              {data.sections.declarations ? (
                <p className="text-sm">
                  Accepted: {(data.sections.declarations as Record<string, unknown>).operativeDeclarationAccepted ? "Yes" : "No"}
                </p>
              ) : (
                <p className="text-sm text-gray-500">Not completed</p>
              )}
            </Section>

            <Section title="Induction History">
              {data.inductionHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No induction history</p>
              ) : (
                <ul className="space-y-2">
                  {data.inductionHistory.map((h) => (
                    <li key={h.siteId} className="text-sm flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{h.siteName}</span>
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs rounded ${
                          h.status === "Inducted" ? "bg-emerald-100 text-emerald-800" :
                          h.status === "Grandfathered" ? "bg-blue-100 text-blue-800" :
                          h.status === "Expired" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {h.status}
                      </span>
                      {h.completedAt && <span className="text-gray-500">{new Date(h.completedAt).toLocaleDateString()}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {operative && (
              <Section title="Supervisor Actions">
                <SupervisorActions
                  operativeId={operative.operativeId}
                  siteId={siteId}
                  onRequestDocuments={() => {}}
                  onFlagOperative={() => {}}
                />
              </Section>
            )}
          </>
        )}

        {!loading && !data && operative && (
          <p className="text-sm text-gray-500">Unable to load details.</p>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-200 pb-4 last:border-0">
      <h3 className="font-medium text-gray-900 mb-2">{title}</h3>
      {children}
    </div>
  );
}
