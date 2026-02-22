"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, ExternalLink } from "lucide-react";
import ComplianceDrawerSection from "./ComplianceDrawerSection";
import ComplianceDocumentPreview from "./ComplianceDocumentPreview";
import ComplianceAdminActions from "./ComplianceAdminActions";
import type { ComplianceDrawerData } from "../server";

type Props = {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  isSubcontractorAdmin: boolean;
  isMobile?: boolean;
  onActionComplete?: () => void;
};

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export default function ComplianceDrawer({
  userId,
  isOpen,
  onClose,
  isSubcontractorAdmin,
  isMobile = false,
  onActionComplete,
}: Props) {
  const [data, setData] = useState<ComplianceDrawerData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) {
      setData(null);
      return;
    }
    setLoading(true);
    fetch(`/api/induction-compliance/drawer?userId=${encodeURIComponent(userId)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const drawerClass = isMobile
    ? "fixed inset-0 z-50 bg-white overflow-y-auto"
    : "fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-xl border-l border-gray-200 z-50 overflow-y-auto";

  return (
    <div className={drawerClass}>
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
        <h2 className="text-lg font-semibold text-gray-900">Compliance Details</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Close"
        >
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
            <ComplianceDrawerSection title="Summary" defaultOpen>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Name:</span> {data.user.name ?? "—"}
                </p>
                <p>
                  <span className="font-medium">Email:</span> {data.user.email ?? "—"}
                </p>
                <p>
                  <span className="font-medium">Company:</span> {data.user.companyName ?? "—"}
                </p>
                <p>
                  <span className="font-medium">Pre-Induction:</span> {data.user.preInductionStatus}
                </p>
                {data.user.complianceScore != null && (
                  <p>
                    <span className="font-medium">Score:</span> {data.user.complianceScore}/100
                  </p>
                )}
                {data.user.adminPreInductionOverride && (
                  <p>
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800">
                      Override Applied
                    </span>
                  </p>
                )}
                <Link
                  href={`/dashboard/users/${userId}/pre-induction`}
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm font-medium"
                >
                  Open Full Pre-Induction Profile
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </ComplianceDrawerSection>

            <ComplianceDrawerSection title="Personal Details" defaultOpen={false}>
              {data.sections.personal ? (
                <div className="text-sm space-y-1">
                  <p>Name: {(data.sections.personal.fullName as string) ?? "—"}</p>
                  <p>Email: {(data.sections.personal.email as string) ?? "—"}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Not completed</p>
              )}
            </ComplianceDrawerSection>

            <ComplianceDrawerSection title="Right to Work" defaultOpen={false}>
              {data.sections.rightToWork ? (
                <ComplianceDocumentPreview
                  documents={[
                    {
                      url: data.sections.rightToWork.passportUrl as string,
                      label: "Passport",
                      verified: data.sections.rightToWork.rightToWorkVerified as boolean,
                    },
                    {
                      url: data.sections.rightToWork.visaUrl as string,
                      label: "Visa",
                      expiry: toDate(data.sections.rightToWork.visaExpiry),
                      verified: data.sections.rightToWork.rightToWorkVerified as boolean,
                    },
                  ].filter((d) => d.url || d.label)}
                  isSubcontractorAdmin={isSubcontractorAdmin}
                />
              ) : (
                <p className="text-sm text-gray-500">Not completed</p>
              )}
            </ComplianceDrawerSection>

            <ComplianceDrawerSection title="Certifications" defaultOpen={false}>
              {data.sections.certifications?.certifications ? (
                <ComplianceDocumentPreview
                  documents={(data.sections.certifications.certifications as Array<Record<string, unknown>>).map(
                    (c) => ({
                      url: c.fileUrl as string,
                      type: c.type as string,
                      label: (c.type as string) ?? "Certification",
                      expiry: toDate(c.expiryDate),
                      verified: c.verified as boolean,
                    })
                  )}
                  isSubcontractorAdmin={isSubcontractorAdmin}
                />
              ) : (
                <p className="text-sm text-gray-500">No certifications</p>
              )}
            </ComplianceDrawerSection>

            <ComplianceDrawerSection title="Medical" defaultOpen={false}>
              {data.sections.medical ? (
                <ComplianceDocumentPreview
                  documents={[
                    {
                      url: data.sections.medical.medicalCertificateUrl as string,
                      label: "Medical Certificate",
                      verified: data.sections.medical.medicalVerified as boolean,
                    },
                  ].filter((d) => d.url || d.label)}
                  isSubcontractorAdmin={isSubcontractorAdmin}
                />
              ) : (
                <p className="text-sm text-gray-500">Not completed</p>
              )}
            </ComplianceDrawerSection>

            <ComplianceDrawerSection title="Training" defaultOpen={false}>
              {data.sections.training?.trainingRecords ? (
                <p className="text-sm">
                  {(data.sections.training.trainingRecords as unknown[]).length} training record(s)
                </p>
              ) : (
                <p className="text-sm text-gray-500">No training records</p>
              )}
            </ComplianceDrawerSection>

            <ComplianceDrawerSection title="Declarations" defaultOpen={false}>
              {data.sections.declarations ? (
                <p className="text-sm">
                  Declaration accepted:{" "}
                  {data.sections.declarations.operativeDeclarationAccepted ? "Yes" : "No"}
                </p>
              ) : (
                <p className="text-sm text-gray-500">Not completed</p>
              )}
            </ComplianceDrawerSection>

            <ComplianceDrawerSection title="Induction History">
              {data.inductionHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No induction history</p>
              ) : (
                <ul className="space-y-2">
                  {data.inductionHistory.map((h) => (
                    <li key={h.siteId} className="text-sm flex items-center gap-2">
                      <span className="font-medium">{h.siteName}</span>
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs rounded ${
                          h.status === "Inducted"
                            ? "bg-emerald-100 text-emerald-800"
                            : h.status === "Grandfathered"
                              ? "bg-blue-100 text-blue-800"
                              : h.status === "Expired"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {h.status}
                      </span>
                      {h.completedAt && (
                        <span className="text-gray-500">
                          {new Date(h.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </ComplianceDrawerSection>

            <ComplianceDrawerSection title="Admin Actions" defaultOpen>
              {userId && (
              <ComplianceAdminActions
                userId={userId}
                isSubcontractorAdmin={isSubcontractorAdmin}
                onToggleOverride={
                  !isSubcontractorAdmin
                    ? async () => {
                        const res = await fetch(`/api/pre-induction/${userId}/override`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            adminPreInductionOverride: !data.user.adminPreInductionOverride,
                          }),
                        });
                        if (res.ok) onActionComplete?.();
                      }
                    : undefined
                }
                onResetInduction={
                  !isSubcontractorAdmin
                    ? async (uid, sid) => {
                        const res = await fetch("/api/induction/reset", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userId: uid, siteId: sid }),
                        });
                        if (res.ok) onActionComplete?.();
                      }
                    : undefined
                }
                onRequestDocuments={() => {}}
              />
              )}
            </ComplianceDrawerSection>
          </>
        )}

        {!loading && !data && userId && (
          <p className="text-sm text-gray-500">Unable to load details.</p>
        )}
      </div>
    </div>
  );
}
