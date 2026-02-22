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
export async function fetchDeliveries() {
  const base = getBaseUrl();
  const url = `${base}/api/deliveries`;
  const cookie = await getCookieHeader();
  const headersInit: HeadersInit = { "Cache-Control": "no-store" };
  if (cookie) headersInit.Cookie = cookie;
  const res = await fetch(url, { cache: "no-store", headers: headersInit });
  if (!res.ok) return [];
  try {
    return await res.json();
  } catch {
    return [];
  }
}

export async function createDelivery(data: any) {
  const base = getBaseUrl();
  const url = `${base}/api/deliveries`;
  const cookie = await getCookieHeader();
  const headersInit: HeadersInit = { "Content-Type": "application/json" };
  if (cookie) headersInit.Cookie = cookie;
  await fetch(url, {
    method: "POST",
    headers: headersInit,
    body: JSON.stringify(data),
  });
}

export async function updateDeliveryStatus(id: string, status: string) {
  const base = getBaseUrl();
  const url = `${base}/api/deliveries/${id}`;
  const cookie = await getCookieHeader();
  const headersInit: HeadersInit = { "Content-Type": "application/json" };
  if (cookie) headersInit.Cookie = cookie;
  await fetch(url, {
    method: "PATCH",
    headers: headersInit,
    body: JSON.stringify({ status }),
  });
}

export async function deleteDelivery(id: string) {
  const base = getBaseUrl();
  const url = `${base}/api/deliveries/${id}`;
  const cookie = await getCookieHeader();
  const headersInit: HeadersInit = {};
  if (cookie) headersInit.Cookie = cookie;
  await fetch(url, {
    method: "DELETE",
    headers: headersInit,
  });
}
