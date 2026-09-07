"use server";

import { getServerRequestBaseUrl } from "@/lib/serverRequestBaseUrl";
import { headers } from "next/headers";

async function getCookieHeader(): Promise<string | undefined> {
  try {
    return (await headers()).get("cookie") ?? undefined;
  } catch {
    return undefined;
  }
}

export async function fetchRAMS(companyId?: string, cookieHeader?: string) {
  try {
    const base = await getServerRequestBaseUrl();
    let url = `${base}/api/rams`;
    if (companyId) url += `?companyId=${encodeURIComponent(companyId)}`;
    const headersInit: HeadersInit = { "Cache-Control": "no-store" };
    const cookie = cookieHeader ?? (await getCookieHeader());
    if (cookie) headersInit.Cookie = cookie;
    const res = await fetch(url, { cache: "no-store", headers: headersInit });
    if (!res.ok) return [];
    return res.json();
  } catch (e) {
    console.error("fetchRAMS:", e);
    return [];
  }
}

export async function updateRAMSStatus(id: string, status: string) {
  const base = await getServerRequestBaseUrl();
  const url = `${base}/api/rams/${id}`;
  const cookie = await getCookieHeader();
  const headersInit: HeadersInit = { "Content-Type": "application/json" };
  if (cookie) headersInit.Cookie = cookie;
  await fetch(url, { method: "PATCH", headers: headersInit, body: JSON.stringify({ status }) });
}

export async function deleteRAMS(id: string) {
  const base = await getServerRequestBaseUrl();
  const url = `${base}/api/rams/${id}`;
  const cookie = await getCookieHeader();
  const headersInit: HeadersInit = {};
  if (cookie) headersInit.Cookie = cookie;
  await fetch(url, { method: "DELETE", headers: headersInit });
}
