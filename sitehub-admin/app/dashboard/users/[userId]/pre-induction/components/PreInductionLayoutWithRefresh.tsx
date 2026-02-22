"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import PreInductionLayout from "./PreInductionLayout";

type SectionId =
  | "personal"
  | "rightToWork"
  | "certifications"
  | "competencyCard"
  | "medical"
  | "training"
  | "declarations";

interface PreInductionLayoutWithRefreshProps {
  userId: string;
  sections: Record<SectionId, Record<string, unknown> | null>;
}

export default function PreInductionLayoutWithRefresh({
  userId,
  sections,
}: PreInductionLayoutWithRefreshProps) {
  const router = useRouter();
  const handleSaved = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <PreInductionLayout
      userId={userId}
      sections={sections}
      onSectionSaved={handleSaved}
    />
  );
}
