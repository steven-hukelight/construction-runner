"use client";

import useSWR, { type SWRConfiguration } from "swr";

/** Shared, de-duplicated reads for data many dashboard components need on the same page. */

export type MeResponse = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  companyId?: string;
  company_id?: string;
  companyName?: string;
};

export type ProfileMe = { name?: string; displayName?: string; email?: string };
export type SiteOption = { id: string; name?: string | null };
export type CompanyOption = { id: string; name?: string | null };

const SHARED: SWRConfiguration = { revalidateOnFocus: false, dedupingInterval: 60_000 };

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function fetchList(url: string): Promise<unknown[]> {
  const data = await fetchJson(url);
  return Array.isArray(data) ? data : [];
}

export function useMe(enabled = true) {
  return useSWR<MeResponse>(enabled ? "/api/me" : null, fetchJson as (url: string) => Promise<MeResponse>, SHARED);
}

export function useProfileMe(enabled = true) {
  return useSWR<ProfileMe | null>(
    enabled ? "/api/profiles/me" : null,
    async (url: string) => {
      const data = (await fetchJson(url)) as ProfileMe | ProfileMe[] | null;
      return (Array.isArray(data) ? data[0] : data) ?? null;
    },
    SHARED,
  );
}

export function useSites(enabled = true) {
  return useSWR<SiteOption[]>(enabled ? "/api/sites" : null, fetchList as (url: string) => Promise<SiteOption[]>, SHARED);
}

export function useCompanies(enabled = true) {
  return useSWR<CompanyOption[]>(
    enabled ? "/api/companies" : null,
    fetchList as (url: string) => Promise<CompanyOption[]>,
    SHARED,
  );
}
