"use client";

import { useState } from "react";
import {
  User,
  FileCheck,
  Award,
  CreditCard,
  Heart,
  GraduationCap,
  FileSignature,
} from "lucide-react";
import PreInductionSectionPersonal from "./PreInductionSectionPersonal";
import PreInductionSectionRightToWork from "./PreInductionSectionRightToWork";
import PreInductionSectionCertifications from "./PreInductionSectionCertifications";
import PreInductionSectionCompetencyCard from "./PreInductionSectionCompetencyCard";
import PreInductionSectionMedical from "./PreInductionSectionMedical";
import PreInductionSectionTraining from "./PreInductionSectionTraining";
import PreInductionSectionDeclarations from "./PreInductionSectionDeclarations";

const BLUE = "#2563EB";

type SectionId =
  | "personal"
  | "rightToWork"
  | "certifications"
  | "competencyCard"
  | "medical"
  | "training"
  | "declarations";

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: "personal", label: "Personal", icon: <User size={18} /> },
  { id: "rightToWork", label: "Right to Work", icon: <FileCheck size={18} /> },
  { id: "certifications", label: "Certifications (optional)", icon: <Award size={18} /> },
  { id: "competencyCard", label: "Competency Card", icon: <CreditCard size={18} /> },
  { id: "medical", label: "Medical", icon: <Heart size={18} /> },
  { id: "training", label: "Training", icon: <GraduationCap size={18} /> },
  { id: "declarations", label: "Declarations", icon: <FileSignature size={18} /> },
];

type SectionsData = Record<SectionId, Record<string, unknown> | null>;

function canAcceptDeclaration(sections: SectionsData): boolean {
  const personal = sections.personal;
  const personalComplete = !!(personal && Object.keys(personal).length > 0 && (personal.full_name ?? personal.fullName ?? personal.email));
  const rtw = sections.rightToWork;
  const rtwHasId = !!(rtw && (rtw.passport_url ?? rtw.passportUrl ?? rtw.visa_url ?? rtw.visaUrl));
  const rtwHasProof = !!(rtw && (rtw.proof_of_address_url ?? rtw.proofOfAddressUrl));
  const rtwVerified = rtw?.right_to_work_verified ?? rtw?.rightToWorkVerified;
  const rtwComplete = !!(rtw && Object.keys(rtw).length > 0 && (rtwVerified === true || (rtwHasId && rtwHasProof)));
  const cc = sections.competencyCard;
  const ccHasDoc = !!(cc?.file_url ?? cc?.fileUrl);
  const ccNum = ((cc?.card_number ?? cc?.cardNumber) ?? "").toString().trim();
  const ccComplete = !!(cc && Object.keys(cc).length > 0 && ccHasDoc && ccNum.length > 0);
  const med = sections.medical;
  const medFitToWork = med?.fit_to_work ?? med?.fitToWork;
  const medHasFitToWork = medFitToWork === true || medFitToWork === "true";
  const medHasCert = !!(med?.medical_certificate_url ?? med?.medicalCertificateUrl);
  const medVerified = med?.medical_verified ?? med?.medicalVerified;
  const medComplete = !!(med && Object.keys(med).length > 0 && (medVerified === true || medHasFitToWork || medHasCert));
  return personalComplete && rtwComplete && ccComplete && medComplete;
}

interface PreInductionLayoutProps {
  userId: string;
  sections: SectionsData;
  onSectionSaved?: (sectionId: SectionId) => void;
}

export default function PreInductionLayout({
  userId,
  sections,
  onSectionSaved,
}: PreInductionLayoutProps) {
  const [activeTab, setActiveTab] = useState<SectionId>("personal");

  const rtw = sections.rightToWork;
  const rtwCompleteVal = !!(rtw && (rtw.right_to_work_verified ?? rtw.rightToWorkVerified)) || (rtw && (rtw.passport_url ?? rtw.passportUrl ?? rtw.visa_url ?? rtw.visaUrl) && (rtw.proof_of_address_url ?? rtw.proofOfAddressUrl));
  const cc = sections.competencyCard;
  const ccCompleteVal = !!(cc && (cc.file_url ?? cc.fileUrl) && ((cc.card_number ?? cc.cardNumber) ?? "").toString().trim().length > 0);
  const med = sections.medical;
  const medHasIssues = med?.has_medical_issues ?? med?.hasMedicalIssues;
  const medFitToWork = med?.fit_to_work ?? med?.fitToWork;
  const medNoIssues = medHasIssues === false || medFitToWork === true || String(medFitToWork ?? "").toLowerCase() === "true";
  const medHasCert = !!(med?.medical_certificate_url ?? med?.medicalCertificateUrl);
  const medVerified = med?.medical_verified ?? med?.medicalVerified;
  const medCompleteVal = !!(med && (medVerified || medNoIssues || medHasCert));
  const medPendingVal = !!(med && (medNoIssues || medHasCert || med?.medical_declaration || med?.medicalDeclaration));
  const sectionStatus: Record<SectionId, "complete" | "pending" | "missing"> = {
    personal: !!(sections.personal && Object.keys(sections.personal).length > 0 && (sections.personal.full_name ?? sections.personal.fullName ?? sections.personal.email)) ? "complete" : "missing",
    rightToWork: rtwCompleteVal ? "complete" : (rtw && ((rtw.passport_url ?? rtw.passportUrl ?? rtw.visa_url ?? rtw.visaUrl) || (rtw.proof_of_address_url ?? rtw.proofOfAddressUrl))) ? "pending" : "missing",
    certifications: "missing",
    competencyCard: ccCompleteVal ? "complete" : (cc && ((cc.file_url ?? cc.fileUrl) || (cc.card_number ?? cc.cardNumber))) ? "pending" : "missing",
    medical: medCompleteVal ? "complete" : medPendingVal ? "pending" : "missing",
    training: "missing",
    declarations: !!(sections.declarations && (sections.declarations.operative_declaration_accepted ?? sections.declarations.operativeDeclarationAccepted)) ? "complete" : "missing",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {SECTIONS.map(({ id, label, icon }) => {
          const status = sectionStatus[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-xl border-b-2 -mb-px transition ${
                activeTab === id
                  ? "border-blue-600 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
              style={activeTab === id ? { borderColor: BLUE } : undefined}
            >
              {icon}
              {label}
              {status === "complete" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" title="Complete" />}
              {status === "pending" && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" title="In progress" />}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {activeTab === "personal" && (
          <PreInductionSectionPersonal
            userId={userId}
            data={sections.personal}
            onSaved={() => onSectionSaved?.("personal")}
          />
        )}
        {activeTab === "rightToWork" && (
          <PreInductionSectionRightToWork
            userId={userId}
            data={sections.rightToWork}
            onSaved={() => onSectionSaved?.("rightToWork")}
          />
        )}
        {activeTab === "certifications" && (
          <PreInductionSectionCertifications
            userId={userId}
            data={sections.certifications}
            onSaved={() => onSectionSaved?.("certifications")}
          />
        )}
        {activeTab === "competencyCard" && (
          <PreInductionSectionCompetencyCard
            userId={userId}
            data={sections.competencyCard}
            onSaved={() => onSectionSaved?.("competencyCard")}
          />
        )}
        {activeTab === "medical" && (
          <PreInductionSectionMedical
            userId={userId}
            data={sections.medical}
            onSaved={() => onSectionSaved?.("medical")}
          />
        )}
        {activeTab === "training" && (
          <PreInductionSectionTraining
            userId={userId}
            data={sections.training}
            onSaved={() => onSectionSaved?.("training")}
          />
        )}
        {activeTab === "declarations" && (
          <PreInductionSectionDeclarations
            userId={userId}
            data={sections.declarations}
            onSaved={() => onSectionSaved?.("declarations")}
            canAcceptDeclaration={canAcceptDeclaration(sections)}
          />
        )}
      </div>
    </div>
  );
}
