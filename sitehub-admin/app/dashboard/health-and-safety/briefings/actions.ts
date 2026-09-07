"use server";

import { getServerRequestBaseUrl } from "@/lib/serverRequestBaseUrl";

export async function fetchBriefings(companyId?: string, cookieHeader?: string) {
  try {
    const base = await getServerRequestBaseUrl();
    let url = `${base}/api/briefings`;
    if (companyId) url += `?companyId=${encodeURIComponent(companyId)}`;
    const headers: HeadersInit = {};
    if (cookieHeader) headers.Cookie = cookieHeader;
    const res = await fetch(url, { cache: "no-store", headers });
    if (!res.ok) return [];
    return res.json();
  } catch (e) {
    console.error("fetchBriefings:", e);
    return [];
  }
}
