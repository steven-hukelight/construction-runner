"use client";

import React from "react";
import Link from "next/link";
import { X, ExternalLink } from "lucide-react";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
import ComplianceDrawerSection from "./ComplianceDrawerSection";
import ComplianceDocumentPreview from "./ComplianceDocumentPreview";
import ComplianceAdminActions from "./ComplianceAdminActions";
import { getPreInductionFileViewUrl } from "@/lib/preInductionFileUrl";
import type { ComplianceDrawerData } from "../server";
import useSWR from "swr";

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

const badgeStyles: Record<string, string> = {
  complete: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
  pending: "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700",
  missing: "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600",
};

function Badge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${badgeStyles[status]}`}>
      {status === "complete" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
      {status === "pending" && <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />}
      {status === "missing" && <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />}
      {label}
    </span>
  );
}

function isTruthyYes(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === "string") {
    const v = String(value).trim().toLowerCase();
    return v === "true" || v === "yes" || v === "y" || v === "1";
  }
  return false;
}

function PreInductionProgressSummary({ sections }: { sections: Record<string, Record<string, unknown> | null> }) {
  const personal = sections.personal;
  const personalComplete = !!personal && Object.keys(personal).length > 0 && (personal.full_name ?? personal.fullName ?? personal.email);
  const rtw = sections.rightToWork;
  const rtwVerified = !!(rtw && (rtw.right_to_work_verified ?? rtw.rightToWorkVerified));
  const rtwHasId = !!(rtw?.passport_url ?? rtw?.passportUrl ?? rtw?.visa_url ?? rtw?.visaUrl);
  const rtwHasProof = !!(rtw?.proof_of_address_url ?? rtw?.proofOfAddressUrl);
  const rtwComplete = rtwVerified || (rtwHasId && rtwHasProof);
  const rtwStatus = rtwComplete ? "Complete" : rtwHasId || rtwHasProof ? "Pending" : "Missing";
  const rtwStatusType = rtwComplete ? "complete" : rtwHasId || rtwHasProof ? "pending" : "missing";
  const cc = sections.competencyCard;
  const ccHasDoc = !!(cc?.file_url ?? cc?.fileUrl);
  const ccNum = ((cc?.card_number ?? cc?.cardNumber) ?? "").toString().trim();
  const ccComplete = !!(cc && ccHasDoc && ccNum.length > 0);
  const med = sections.medical;
  const medVerified = !!(med && (med.medical_verified ?? med.medicalVerified));
  const medHasIssues = med?.has_medical_issues ?? med?.hasMedicalIssues;
  const medFitToWork = med?.fit_to_work ?? med?.fitToWork;
  const medNoIssues = medHasIssues === false || isTruthyYes(medFitToWork);
  const medHasCert = !!(med?.medical_certificate_url ?? med?.medicalCertificateUrl);
  const medComplete = medVerified || medNoIssues || medHasCert;
  const medHasData = !!(med?.medical_declaration ?? med?.medicalDeclaration ?? medHasCert ?? medFitToWork != null);
  const medStatus = medComplete ? "Complete" : medHasData ? "Pending" : "Missing";
  const medStatusType = medComplete ? "complete" : medHasData ? "pending" : "missing";
  const decl = sections.declarations;
  const declAccepted = !!(decl && (decl.operative_declaration_accepted ?? decl.operativeDeclarationAccepted));
  const declStatusType = declAccepted ? "complete" : "missing";
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-gray-600 dark:text-slate-400">Personal</span>
        <Badge status={personalComplete ? "complete" : "missing"} label={personalComplete ? "Complete" : "Missing"} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-gray-600 dark:text-slate-400">Right to Work</span>
        <Badge status={rtwStatusType} label={rtwStatus} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-gray-600 dark:text-slate-400">Competency Card</span>
        <Badge status={ccComplete ? "complete" : "missing"} label={ccComplete ? "Complete" : "Missing"} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-gray-600 dark:text-slate-400">Medical</span>
        <Badge status={medStatusType} label={medStatus} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-gray-600 dark:text-slate-400">Declarations</span>
        <Badge status={declStatusType} label={declAccepted ? "Accepted" : "Not accepted"} />
      </div>
    </div>
  );
}

export default function ComplianceDrawer({
  userId,
  isOpen,
  onClose,
  isSubcontractorAdmin,
  isMobile = false,
  onActionComplete,
}: Props) {
  const { data, isLoading } = useSWR<ComplianceDrawerData | null>(
    isOpen && userId ? `/api/induction-compliance/drawer?userId=${encodeURIComponent(userId)}` : null,
    (url) => fetch(url, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
    { revalidateOnFocus: false }
  );

  if (!isOpen) return null;

  const drawerClass = isMobile
    ? "fixed inset-0 z-50 bg-white dark:bg-slate-800 overflow-y-auto"
    : "fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-slate-800 shadow-xl border-l border-gray-200 dark:border-slate-600 z-50 overflow-y-auto";

  return (
    <div className={drawerClass}>
      <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-600 px-6 py-4 flex items-center justify-between z-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Compliance Details</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        )}

        {!isLoading && data && (
          <>


            <ComplianceDrawerSection title="Summary" defaultOpen>
              <div className="space-y-4 text-sm">
                <div className="space-y-2">
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
                </div>
                <div>
                  <p className="font-medium text-gray-700 dark:text-slate-300 mb-2">Pre-Induction Progress</p>
                  <PreInductionProgressSummary sections={data.sections} />
                </div>
                {data.user.complianceScore != null && (
                  <p>
                    <span className="font-medium">Score:</span> {data.user.complianceScore}/100
                  </p>
                )}
                {data.user.adminPreInductionOverride && (
                  <p>
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300">
                      Override Applied
                    </span>
                  </p>
                )}
                <Link
                  href={`/dashboard/users/${userId}/pre-induction`}
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                >
                  Open Full Pre-Induction Profile
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </ComplianceDrawerSection>

            <ComplianceDrawerSection title="Personal Details" defaultOpen={false}>
              {data.sections.personal ? (
                <div className="text-sm space-y-1">
                  <p>Name: {String(data.sections.personal.full_name ?? data.sections.personal.fullName ?? "—")}</p>
                  <p>Email: {String(data.sections.personal.email ?? "—")}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400">Not completed</p>
              )}
            </ComplianceDrawerSection>

            <ComplianceDrawerSection title="Right to Work" defaultOpen={false}>
              {data.sections.rightToWork ? (
                (() => {
                  const rtw = data.sections.rightToWork;
                  const hasPassport = !!(rtw.passport_url ?? rtw.passportUrl);
                  const rtwDocs = [
                    {
                      url: (rtw.passport_url ?? rtw.passportUrl) as string,
                      label: "Passport",
                      verified: (rtw.right_to_work_verified ?? rtw.rightToWorkVerified) as boolean,
                      expiry: toDate(rtw.passport_expiry ?? rtw.passportExpiry),
                    },
                    {
                      url: (rtw.visa_url ?? rtw.visaUrl) as string,
                      label: "Visa",
                      expiry: toDate(rtw.visa_expiry ?? rtw.visaExpiry),
                      verified: (rtw.right_to_work_verified ?? rtw.rightToWorkVerified) as boolean,
                    },
                    {
                      url: (rtw.proof_of_address_url ?? rtw.proofOfAddressUrl) as string,
                      label: "Proof of address",
                      verified: (rtw.right_to_work_verified ?? rtw.rightToWorkVerified) as boolean,
                    },
                  ].filter((d) => (d.label === "Visa" && hasPassport ? false : !!d.url || !!d.label));
                  return (
                    <ComplianceDocumentPreview
                      documents={rtwDocs}
                      isSubcontractorAdmin={isSubcontractorAdmin}
                    />
                  );
                })()
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400">Not completed</p>
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
                <p className="text-sm text-gray-500 dark:text-slate-400">No certifications</p>
              )}
            </ComplianceDrawerSection>

            <ComplianceDrawerSection title="Competency Card" defaultOpen={false}>
              {data.sections.competencyCard && (data.sections.competencyCard.card_number ?? data.sections.competencyCard.cardNumber ?? data.sections.competencyCard.file_url ?? data.sections.competencyCard.fileUrl) ? (
                <div className="text-sm space-y-1">
                  <p>Type: {String(data.sections.competencyCard.card_type ?? data.sections.competencyCard.cardType ?? "—")}</p>
                  <p>Number: {String(data.sections.competencyCard.card_number ?? data.sections.competencyCard.cardNumber ?? "—")}</p>
                  {(data.sections.competencyCard.file_url ?? data.sections.competencyCard.fileUrl) ? (
                    <a href={getPreInductionFileViewUrl(String(data.sections.competencyCard.file_url ?? data.sections.competencyCard.fileUrl)) ?? String(data.sections.competencyCard.file_url ?? data.sections.competencyCard.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">View document</a>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400">Not completed</p>
              )}
            </ComplianceDrawerSection>

            <ComplianceDrawerSection title="Medical" defaultOpen={false}>
              {data.sections.medical ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 dark:text-slate-300">Fit to work:</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100">
                      {data.sections.medical.fit_to_work ?? data.sections.medical.fitToWork ? "Yes" : "No"}
                    </span>
                  </div>
                  {(data.sections.medical.has_medical_issues ?? data.sections.medical.hasMedicalIssues) === true ? (
                    <ComplianceDocumentPreview
                      documents={[
                        {
                          url: (data.sections.medical.medical_certificate_url ?? data.sections.medical.medicalCertificateUrl) as string,
                          label: "Medical Certificate",
                          verified: (data.sections.medical.medical_verified ?? data.sections.medical.medicalVerified) as boolean,
                        },
                      ].filter((d) => d.url || d.label)}
                      isSubcontractorAdmin={isSubcontractorAdmin}
                    />
                  ) : (
                    <p className="text-gray-500 dark:text-slate-400 text-sm">Medical certificate not required — no medical issues declared.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400">Not completed</p>
              )}
            </ComplianceDrawerSection>

            <ComplianceDrawerSection title="Training" defaultOpen={false}>
              {data.sections.training?.trainingRecords ? (
                <p className="text-sm">
                  {(data.sections.training.trainingRecords as unknown[]).length} training record(s)
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400">No training records</p>
              )}
            </ComplianceDrawerSection>

            <ComplianceDrawerSection title="Declarations" defaultOpen={false}>
              {data.sections.declarations ? (
                <p className="text-sm">
                  Declaration accepted: {" "}
                  {(data.sections.declarations.operative_declaration_accepted ?? data.sections.declarations.operativeDeclarationAccepted) ? "Yes" : "No"}
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400">Not completed</p>
              )}
            </ComplianceDrawerSection>

            <ComplianceDrawerSection title="Induction History">
              {data.inductionHistory.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">No induction history</p>
              ) : (
                <ul className="space-y-2">
                  {data.inductionHistory.map((h) => (
                    <li key={h.siteId} className="text-sm flex items-center gap-2">
                      <span className="font-medium">{h.siteName}</span>
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs rounded ${
                          h.status === "Inducted"
                            ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300"
                            : h.status === "Grandfathered"
                              ? "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300"
                              : h.status === "Expired"
                                ? "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300"
                                : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300"
                        }`}
                      >
                        {h.status}
                      </span>
                      {h.completedAt && (
                        <span className="text-gray-500 dark:text-slate-400">
                          {formatDateTime(h.completedAt)}
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

        {!isLoading && !data && userId && (
          <p className="text-sm text-gray-500 dark:text-slate-400">Unable to load details.</p>
        )}
      </div>
    </div>
  );
}
