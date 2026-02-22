"use client";

import { useState, useEffect } from "react";

export type InductionStatus = "not_started" | "in_progress" | "completed" | "expired" | null;

export function useInductionStatus(
  userId: string | null | undefined,
  siteId: string | null | undefined
): { status: InductionStatus; loading: boolean } {
  const [status, setStatus] = useState<InductionStatus>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !siteId) {
      setStatus(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/induction-status?userId=${encodeURIComponent(userId)}&siteId=${encodeURIComponent(siteId)}`)
      .then((res) => res.json())
      .then((data) => {
        setStatus((data?.status as InductionStatus) ?? "not_started");
      })
      .catch(() => setStatus("not_started"))
      .finally(() => setLoading(false));
  }, [userId, siteId]);

  return { status, loading };
}
