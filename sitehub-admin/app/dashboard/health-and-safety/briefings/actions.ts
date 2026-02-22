"use server";

import { getBaseUrl } from "@/lib/url";

export async function fetchBriefings(companyId?: string, cookieHeader?: string) {
  const base = getBaseUrl();
  let url = `${base}/api/briefings`;
  if (companyId) url += `?companyId=${encodeURIComponent(companyId)}`;
  const headers: HeadersInit = {};
  if (cookieHeader) headers.Cookie = cookieHeader;
  const res = await fetch(url, { cache: "no-store", headers });
  if (!res.ok) return [];
  return res.json();
}
