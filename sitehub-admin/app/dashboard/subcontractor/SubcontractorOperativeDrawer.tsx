"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, ExternalLink, AlertTriangle, Clock, FileText } from "lucide-react";
import RAMSStatusBadge from "../components/RAMSStatusBadge";
import SubcontractorUploadMissingDocuments from "./SubcontractorUploadMissingDocuments";
import SubcontractorRequestVerification from "./SubcontractorRequestVerification";
import type { SubcontractorOperativeRow } from "./utils/buildSubcontractorComplianceDataset";

type RamsBySite = {
  siteId: string;
  siteName: string;
  status: string;
  currentVersion: string | null;
  acceptedVersion: string | null;
  acceptedAt: Date | null;
  fileUrl: string | null;
  title: string | null;
};

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
  inductionHistory: Array<{
    siteId: string;
    siteName: string;
    status: string;
    completedAt: Date | null;
    grandfathered?: boolean;
  }>;
  ramsBySite?: RamsBySite[];
};

type Props = {
  operative: SubcontractorOperativeRow;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  isMobile?: boolean;
  isTablet?: boolean;
};

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 text-left font-medium text-gray-900 bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
      >
        {title}
        <span className="text-gray-500">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="p-4 bg-white border-t border-gray-100">{children}</div>}
    </div>
  );
}

export default function SubcontractorOperativeDrawer({
  operative,
  isOpen,
  onClose,
  onRefresh,
  isMobile = false,
  isTablet = false,
}: Props) {
  const [data, setData] = useState<DrawerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [personalEdit, setPersonalEdit] = useState<Record<string, string>>({});
  const [savingPersonal, setSavingPersonal] = useState(false);

  useEffect(() => {
    if (!isOpen || !operative) {
      setData(null);
      return;
    }
    setLoading(true);
    const siteIdsParam = operative.siteIds.length > 0 ? `&siteIds=${operative.siteIds.join(",")}` : "";
    fetch(`/api/induction-compliance/drawer?userId=${encodeURIComponent(operative.userId)}${siteIdsParam}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        if (d?.sections?.personal) {
          const p = d.sections.personal as Record<string, unknown>;
          setPersonalEdit({
            fullName: (p.fullName as string) ?? "",
            email: (p.email as string) ?? "",
            phone: (p.phone as string) ?? "",
            trade: (p.trade as string) ?? "",
            address: (p.address as string) ?? "",
          });
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [isOpen, operative]);

  async function savePersonal() {
    setSavingPersonal(true);
    try {
      const res = await fetch(`/api/pre-induction/${operative.userId}/personal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(personalEdit),
        credentials: "include",
      });
      if (res.ok) {
        onRefresh();
        setData((prev) =>
          prev
            ? {
                ...prev,
                sections: {
                  ...prev.sections,
                  personal: { ...prev.sections.personal, ...personalEdit },
                },
              }
            : null
        );
      }
    } finally {
      setSavingPersonal(false);
    }
  }

  if (!isOpen) return null;

  const drawerClass = isMobile
    ? "fixed inset-0 z-50 bg-white overflow-y-auto"
    : isTablet
      ? "w-full max-w-md bg-white border-l border-gray-200 shadow-xl overflow-y-auto"
      : "fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-xl border-l border-gray-200 z-50 overflow-y-auto";

  return (
    <div className={drawerClass}>
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
        <h2 className="text-lg font-semibold text-gray-900">Operative Details</h2>
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
            <Section title="Summary" defaultOpen>
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
                  <span className="font-medium">Pre-Induction:</span> {data.user.preInductionStatus.replace("_", " ")}
                </p>
                {data.user.complianceScore != null && (
                  <p>
                    <span className="font-medium">Score:</span> {data.user.complianceScore}/100
                  </p>
                )}
                <Link
                  href={`/dashboard/users/${operative.userId}/pre-induction`}
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm font-medium"
                  target="_blank"
                >
                  View Pre-Induction Profile
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </Section>

            <Section title="Personal Details (editable)" defaultOpen>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Full Name</label>
                  <input
                    type="text"
                    value={personalEdit.fullName ?? ""}
                    onChange={(e) => setPersonalEdit((p) => ({ ...p, fullName: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Email</label>
                  <input
                    type="email"
                    value={personalEdit.email ?? ""}
                    onChange={(e) => setPersonalEdit((p) => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Phone</label>
                  <input
                    type="tel"
                    value={personalEdit.phone ?? ""}
                    onChange={(e) => setPersonalEdit((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Trade</label>
                  <input
                    type="text"
                    value={personalEdit.trade ?? ""}
                    onChange={(e) => setPersonalEdit((p) => ({ ...p, trade: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Address</label>
                  <input
                    type="text"
                    value={personalEdit.address ?? ""}
                    onChange={(e) => setPersonalEdit((p) => ({ ...p, address: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={savePersonal}
                  disabled={savingPersonal}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingPersonal ? "Saving…" : "Save"}
                </button>
              </div>
            </Section>

            <Section title="Right to Work (upload only)">
              {data.sections.rightToWork ? (
                <div className="text-sm space-y-1">
                  <p>Passport: {data.sections.rightToWork.passportUrl ? "Uploaded" : "Missing"}</p>
                  <p>Visa: {data.sections.rightToWork.visaUrl ? "Uploaded" : "Not required / Missing"}</p>
                  <p className="text-gray-500">Verified: {data.sections.rightToWork.rightToWorkVerified ? "Yes" : "No (main contractor must verify)"}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Not completed</p>
              )}
            </Section>

            <Section title="Certifications (upload only)">
              {(data.sections.certifications as Record<string, unknown>)?.certifications ? (
                <div className="text-sm">
                  <p>
                    {((data.sections.certifications as Record<string, unknown>).certifications as unknown[]).length}{" "}
                    certification(s)
                  </p>
                  <p className="text-gray-500 text-xs mt-1">Verification by main contractor required</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No certifications</p>
              )}
            </Section>

            <Section title="Medical (upload only)">
              {data.sections.medical ? (
                <p className="text-sm">
                  Certificate: {data.sections.medical.medicalCertificateUrl ? "Uploaded" : "Missing"}
                  <br />
                  <span className="text-gray-500">Verified: {data.sections.medical.medicalVerified ? "Yes" : "No"}</span>
                </p>
              ) : (
                <p className="text-sm text-gray-500">Not completed</p>
              )}
            </Section>

            <Section title="Training (read-only)">
              {(data.sections.training as Record<string, unknown>)?.trainingRecords ? (
                <p className="text-sm">
                  {((data.sections.training as Record<string, unknown>).trainingRecords as unknown[]).length} training
                  record(s)
                </p>
              ) : (
                <p className="text-sm text-gray-500">No training records</p>
              )}
            </Section>

            {data.ramsBySite && data.ramsBySite.length > 0 && (
              <Section title="RAMS">
                <div className="space-y-4 text-sm">
                  {data.ramsBySite.map((r) => (
                    <div key={r.siteId} className="border rounded-lg p-3 border-gray-100">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-medium">{r.siteName}</span>
                        <RAMSStatusBadge status={r.status as "accepted" | "pending" | "outdated" | "not_required"} />
                      </div>
                      {r.currentVersion && <p><span className="font-medium">Current version:</span> {r.currentVersion}</p>}
                      {r.acceptedVersion && <p><span className="font-medium">Accepted version:</span> {r.acceptedVersion}</p>}
                      {r.acceptedAt && <p><span className="font-medium">Accepted at:</span> {new Date(r.acceptedAt).toLocaleString()}</p>}
                      {r.fileUrl && (
                        <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline mt-1">
                          <FileText className="h-4 w-4" />
                          View RAMS
                        </a>
                      )}
                      {(r.status === "pending" || r.status === "outdated") && (
                        <p className="text-amber-700 text-xs mt-2">Request the operative to accept RAMS (mobile app).</p>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Declarations (read-only)">
              {data.sections.declarations ? (
                <p className="text-sm">
                  Operative accepted: {data.sections.declarations.operativeDeclarationAccepted ? "Yes" : "No"}
                </p>
              ) : (
                <p className="text-sm text-gray-500">Not completed</p>
              )}
            </Section>

            {operative.missingItems.length > 0 && (
              <Section title="Missing Items">
                <ul className="text-sm text-amber-700 space-y-1">
                  {operative.missingItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {operative.expiringItems.length > 0 && (
              <Section title="Expiry Warnings">
                <ul className="text-sm text-amber-700 space-y-1">
                  {operative.expiringItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Subcontractor Actions" defaultOpen>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowUpload(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
                >
                  Upload Missing Documents
                </button>
                <button
                  type="button"
                  onClick={() => setShowVerify(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium"
                >
                  Request Verification
                </button>
                <Link
                  href={`/dashboard/users/${operative.userId}/pre-induction`}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
                >
                  View Pre-Induction Profile
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </Section>
          </>
        )}
      </div>

      {showUpload && (
        <SubcontractorUploadMissingDocuments
          operative={operative}
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            onRefresh();
          }}
        />
      )}

      {showVerify && (
        <SubcontractorRequestVerification
          operative={operative}
          onClose={() => setShowVerify(false)}
          onSuccess={() => {
            setShowVerify(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
