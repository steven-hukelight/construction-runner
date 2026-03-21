"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { supabase } from "@/supabase/auth/client";
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

const PRE_INDUCTION_TABLES = [
  "pre_induction_personal",
  "pre_induction_right_to_work",
  "pre_induction_certifications",
  "pre_induction_competency_card",
  "pre_induction_medical",
  "pre_induction_training",
  "pre_induction_declarations",
] as const;

export default function PreInductionLayoutWithRefresh({
  userId,
  sections,
}: PreInductionLayoutWithRefreshProps) {
  const router = useRouter();
  const handleSaved = useCallback(() => {
    router.refresh();
  }, [router]);

  // Subscribe to Supabase realtime so data from mobile or other tabs refreshes automatically
  useEffect(() => {
    if (!userId) return;
    const refresh = () => router.refresh();
    let channel = supabase
      .channel(`pre-induction-${userId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "users",
        filter: `id=eq.${userId}`,
      }, refresh);
    for (const table of PRE_INDUCTION_TABLES) {
      channel = channel.on("postgres_changes", {
        event: "*",
        schema: "public",
        table,
        filter: `user_id=eq.${userId}`,
      }, refresh);
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return (
    <PreInductionLayout
      userId={userId}
      sections={sections}
      onSectionSaved={handleSaved}
    />
  );
}
