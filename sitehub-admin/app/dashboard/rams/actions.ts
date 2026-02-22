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

export async function fetchRAMS(companyId?: string, cookieHeader?: string) {
  const base = getBaseUrl();
  let url = `${base}/api/rams`;
  if (companyId) url += `?companyId=${encodeURIComponent(companyId)}`;
  const headersInit: HeadersInit = { "Cache-Control": "no-store" };
  const cookie = cookieHeader ?? (await getCookieHeader());
  if (cookie) headersInit.Cookie = cookie;
  const res = await fetch(url, { cache: "no-store", headers: headersInit });
  if (!res.ok) return [];
  return res.json();
}

export async function updateRAMSStatus(id: string, status: string) {
  const base = getBaseUrl();
  const url = `${base}/api/rams/${id}`;
  const cookie = await getCookieHeader();
  const headersInit: HeadersInit = { "Content-Type": "application/json" };
  if (cookie) headersInit.Cookie = cookie;
  await fetch(url, { method: "PATCH", headers: headersInit, body: JSON.stringify({ status }) });
}

export async function deleteRAMS(id: string) {
  const base = getBaseUrl();
  const url = `${base}/api/rams/${id}`;
  const cookie = await getCookieHeader();
  const headersInit: HeadersInit = {};
  if (cookie) headersInit.Cookie = cookie;
  await fetch(url, { method: "DELETE", headers: headersInit });
}
