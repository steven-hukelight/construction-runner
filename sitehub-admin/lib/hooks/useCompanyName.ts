"use client";

import useSWR from "swr";

const cache: Record<string, string | null> = {};

export function useCompanyName(companyId: string | null | undefined): string | null {
  const fetcher = (url: string) =>
    fetch(url, { cache: "no-store", credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => data?.name ?? null)
      .catch(() => null);

  const { data } = useSWR<string | null>(
    companyId ? `/api/company-name?companyId=${encodeURIComponent(companyId)}` : null,
    async (url) => {
      if (cache[companyId ?? ""] !== undefined) return cache[companyId ?? ""];
      const name = await fetcher(url);
      if (companyId) cache[companyId] = name;
      return name;
    },
    { revalidateOnFocus: false }
  );

  return data ?? (companyId ? cache[companyId] ?? null : null);
}
