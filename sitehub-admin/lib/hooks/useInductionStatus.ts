"use client";

import useSWR from "swr";

export type InductionStatus = "not_started" | "in_progress" | "completed" | "expired" | null;

export function useInductionStatus(
  userId: string | null | undefined,
  siteId: string | null | undefined
): { status: InductionStatus; loading: boolean } {
  const fetcher = async (url: string): Promise<InductionStatus> => {
    try {
      const res = await fetch(url, { cache: "no-store", credentials: "include" });
      const data = res.ok ? await res.json() : null;
      return (data?.status as InductionStatus) ?? "not_started";
    } catch {
      return "not_started";
    }
  };

  const key = userId && siteId
    ? `/api/induction-status?userId=${encodeURIComponent(userId)}&siteId=${encodeURIComponent(siteId)}`
    : null;

  const { data, isLoading } = useSWR<InductionStatus>(key, fetcher, { revalidateOnFocus: false });

  return { status: data ?? null, loading: isLoading };
}
