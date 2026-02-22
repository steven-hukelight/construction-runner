"use server";

import { getBaseUrl } from "@/lib/url";
import { headers } from "next/headers";

async function getCookieHeader(): Promise<string | undefined> {
  try {
    return (await headers()).get("cookie") ?? undefined;
  } catch {
    return undefined;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchSites(companyId?: string, cookieHeader?: string) {
  const base = getBaseUrl();
  let url = `${base}/api/sites`;
  if (companyId) url += `?companyId=${encodeURIComponent(companyId)}`;
  const headersInit: HeadersInit = { "Cache-Control": "no-store" };
  const cookie = cookieHeader ?? (await getCookieHeader());
  if (cookie) headersInit.Cookie = cookie;
  const res = await fetch(url, { cache: "no-store", headers: headersInit });
  if (!res.ok) return [];
  try {
    return await res.json();
  } catch {
    return [];
  }
}

export async function createSite(data: any) {
  const base = getBaseUrl();
  const url = `${base}/api/sites`;
  const headersInit: HeadersInit = { "Content-Type": "application/json" };
  const cookie = await getCookieHeader();
  if (cookie) headersInit.Cookie = cookie;
  const res = await fetch(url, {
    method: "POST",
    headers: headersInit,
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateSite(id: string, data: any) {
  const base = getBaseUrl();
  const headersInit: HeadersInit = { "Content-Type": "application/json" };
  const cookie = await getCookieHeader();
  if (cookie) headersInit.Cookie = cookie;
  const res = await fetch(`${base}/api/sites/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: headersInit,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error("Failed to update site");
  }
  return res.json();
}

export async function deleteSite(id: string) {
  const base = getBaseUrl();
  const url = `${base}/api/sites?id=${encodeURIComponent(id)}`;
  const headersInit: HeadersInit = {};
  const cookie = await getCookieHeader();
  if (cookie) headersInit.Cookie = cookie;
  await fetch(url, {
    method: "DELETE",
    headers: headersInit,
  });
}
