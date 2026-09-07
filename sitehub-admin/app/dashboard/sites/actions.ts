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

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchSites(companyId?: string, cookieHeader?: string) {
  try {
    const base = await getServerRequestBaseUrl();
    let url = `${base}/api/sites`;
    if (companyId) url += `?companyId=${encodeURIComponent(companyId)}`;
    const headersInit: HeadersInit = { "Cache-Control": "no-store" };
    const cookie = cookieHeader ?? (await getCookieHeader());
    if (cookie) headersInit.Cookie = cookie;
    const res = await fetch(url, { cache: "no-store", headers: headersInit });
    if (!res.ok) return [];
    try {
      const list = await res.json();
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  } catch (e) {
    console.error("fetchSites:", e);
    return [];
  }
}

export async function createSite(data: any) {
  let base: string;
  try {
    base = await getServerRequestBaseUrl();
  } catch (e) {
    console.error("createSite base URL:", e);
    throw new Error("Could not reach the app server to save. Try again after redeploy.");
  }
  const url = `${base}/api/sites`;
  const headersInit: HeadersInit = { "Content-Type": "application/json" };
  const cookie = await getCookieHeader();
  if (cookie) headersInit.Cookie = cookie;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: headersInit,
      body: JSON.stringify(data),
      cache: "no-store",
    });
  } catch (e) {
    console.error("createSite fetch:", e);
    throw new Error("Network error while creating the site. Check your connection and try again.");
  }
  if (!res.ok) {
    let message = "Failed to create site";
    try {
      const j = (await res.json()) as { error?: string };
      if (typeof j?.error === "string" && j.error) message = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}

export async function updateSite(id: string, data: any) {
  let base: string;
  try {
    base = await getServerRequestBaseUrl();
  } catch (e) {
    console.error("updateSite base URL:", e);
    throw new Error("Could not reach the app server to save. Try again after redeploy.");
  }
  const headersInit: HeadersInit = { "Content-Type": "application/json" };
  const cookie = await getCookieHeader();
  if (cookie) headersInit.Cookie = cookie;
  let res: Response;
  try {
    res = await fetch(`${base}/api/sites/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: headersInit,
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.error("updateSite fetch:", e);
    throw new Error("Network error while saving the site. Check your connection and try again.");
  }
  if (!res.ok) {
    let message = "Failed to update site";
    try {
      const j = (await res.json()) as { error?: string };
      if (typeof j?.error === "string" && j.error) message = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}

