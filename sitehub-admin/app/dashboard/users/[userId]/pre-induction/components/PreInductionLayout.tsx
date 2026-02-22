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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {SECTIONS.map(({ id, label, icon }) => (
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
          </button>
        ))}
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
          />
        )}
      </div>
    </div>
  );
}
